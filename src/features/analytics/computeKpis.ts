import type { CalcRowView } from '@/services/calculations';
import { daysBetween } from '@/shared/lib/format';
import { STATUS_LABEL, type StatusCode } from '@/shared/schemas';

const APPROVED_LIKE: StatusCode[] = ['APPROVED', 'IN_DS', 'DS_SIGNED'];

export interface Kpis {
  pipelineValue: number;
  signedValue: number;
  conversionRate: number;
  medianCycleDays: number;
  stuckCount: number;
  refusalValue: number;
}

const IN_WORK: StatusCode[] = ['SENT_TO_CUSTOMER', 'SENT_AGAIN', 'APPROVED', 'IN_DS', 'REJECTED_RESUBMIT'];

export function computeKpis(rows: CalcRowView[]): Kpis {
  const pipelineValue = rows
    .filter((r) => IN_WORK.includes(r.currentVersion.status))
    .reduce((s, r) => s + Number(r.currentVersion.totalAmount), 0);

  const signed = rows.filter((r) => r.currentVersion.status === 'DS_SIGNED');
  const signedValue = signed.reduce((s, r) => s + Number(r.currentVersion.totalAmount), 0);

  const allWithResolution = rows.filter((r) =>
    ['DS_SIGNED', 'REJECTED', 'IN_DS', 'APPROVED'].includes(r.currentVersion.status),
  );
  const sumResolutions = allWithResolution.reduce(
    (s, r) => s + Number(r.currentVersion.totalAmount),
    0,
  );
  const conversionRate = sumResolutions > 0 ? signedValue / sumResolutions : 0;

  const closed = rows.filter((r) => r.currentVersion.status === 'DS_SIGNED');
  const cycles = closed
    .filter((r) => r.currentVersion.letter.sentAt)
    .map((r) =>
      daysBetween(r.currentVersion.letter.sentAt as string, r.currentVersion.updatedAt),
    )
    .sort((a, b) => a - b);
  const medianCycleDays = cycles.length
    ? cycles[Math.floor(cycles.length / 2)]
    : 0;

  const stuckCount = rows.filter(
    (r) => IN_WORK.includes(r.currentVersion.status) && daysBetween(r.currentVersion.updatedAt) > 30,
  ).length;

  const refusalValue = rows
    .filter((r) => r.currentVersion.status === 'REJECTED')
    .reduce((s, r) => s + Number(r.currentVersion.totalAmount), 0);

  return {
    pipelineValue,
    signedValue,
    conversionRate,
    medianCycleDays,
    stuckCount,
    refusalValue,
  };
}

export interface StatusBucket {
  status: StatusCode;
  label: string;
  count: number;
  sum: number;
}

export function bucketByStatus(rows: CalcRowView[]): StatusBucket[] {
  const m = new Map<StatusCode, { count: number; sum: number }>();
  for (const r of rows) {
    const s = r.currentVersion.status;
    const cur = m.get(s) ?? { count: 0, sum: 0 };
    cur.count += 1;
    cur.sum += Number(r.currentVersion.totalAmount);
    m.set(s, cur);
  }
  return [...m.entries()].map(([status, v]) => ({
    status,
    label: STATUS_LABEL[status],
    count: v.count,
    sum: v.sum,
  }));
}

export interface ObjectBucket {
  objectId: string;
  objectName: string;
  color: string;
  statuses: Partial<Record<StatusCode, number>>;
  total: number;
}

export function bucketByObject(rows: CalcRowView[]): ObjectBucket[] {
  const m = new Map<string, ObjectBucket>();
  for (const r of rows) {
    const id = r.calculation.objectId;
    let b = m.get(id);
    if (!b) {
      b = {
        objectId: id,
        objectName: r.objectName,
        color: r.objectColor,
        statuses: {},
        total: 0,
      };
      m.set(id, b);
    }
    const s = r.currentVersion.status;
    b.statuses[s] = (b.statuses[s] ?? 0) + Number(r.currentVersion.totalAmount);
    b.total += Number(r.currentVersion.totalAmount);
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

export function cumulativeSignedByMonth(rows: CalcRowView[]): Array<{ month: string; sum: number; cumulative: number }> {
  const monthMap = new Map<string, number>();
  for (const r of rows.filter((x) => x.currentVersion.status === 'DS_SIGNED')) {
    const d = r.currentVersion.updatedAt.slice(0, 7); // YYYY-MM
    monthMap.set(d, (monthMap.get(d) ?? 0) + Number(r.currentVersion.totalAmount));
  }
  const sorted = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let cum = 0;
  return sorted.map(([month, sum]) => {
    cum += sum;
    return { month, sum, cumulative: cum };
  });
}

export interface SankeyData {
  nodes: Array<{ name: string }>;
  links: Array<{ source: string; target: string; value: number }>;
}

export function buildSankeyByStatus(rows: CalcRowView[]): SankeyData {
  const buckets = bucketByStatus(rows);
  const nodes = [
    { name: 'Все расчёты' },
    ...buckets.map((b) => ({ name: b.label })),
  ];
  const links = buckets
    .filter((b) => b.sum > 0)
    .map((b) => ({
      source: 'Все расчёты',
      target: b.label,
      value: Math.round(b.sum),
    }));
  return { nodes, links };
}

export interface AssigneeBucket {
  assigneeId: string | null;
  assigneeName: string;
  count: number;
  pipelineSum: number;
  signedSum: number;
  refusedSum: number;
  stuckCount: number;
  medianCycleDays: number;
}

export function bucketByAssignee(rows: CalcRowView[]): AssigneeBucket[] {
  const m = new Map<string, { rows: CalcRowView[]; name: string }>();
  for (const r of rows) {
    const id = r.calculation.assigneeId ?? '__unassigned__';
    let b = m.get(id);
    if (!b) {
      b = { rows: [], name: r.assigneeName ?? '— не назначен' };
      m.set(id, b);
    }
    b.rows.push(r);
  }

  const result: AssigneeBucket[] = [];
  for (const [id, b] of m) {
    let pipelineSum = 0;
    let signedSum = 0;
    let refusedSum = 0;
    let stuckCount = 0;
    const cycles: number[] = [];
    for (const r of b.rows) {
      const s = r.currentVersion.status;
      const amt = Number(r.currentVersion.totalAmount);
      if (IN_WORK.includes(s)) {
        pipelineSum += amt;
        if (daysBetween(r.currentVersion.updatedAt) > 30) stuckCount++;
      } else if (s === 'DS_SIGNED') {
        signedSum += amt;
        if (r.currentVersion.letter.sentAt) {
          cycles.push(
            daysBetween(r.currentVersion.letter.sentAt, r.currentVersion.updatedAt),
          );
        }
      } else if (s === 'REJECTED') {
        refusedSum += amt;
      }
    }
    cycles.sort((a, b) => a - b);
    const medianCycleDays = cycles.length
      ? cycles[Math.floor(cycles.length / 2)]
      : 0;
    result.push({
      assigneeId: id === '__unassigned__' ? null : id,
      assigneeName: b.name,
      count: b.rows.length,
      pipelineSum,
      signedSum,
      refusedSum,
      stuckCount,
      medianCycleDays,
    });
  }
  return result.sort((a, b) => b.signedSum - a.signedSum);
}

export interface FunnelStage {
  key: 'created' | 'sent' | 'approved' | 'signed' | 'rejected';
  label: string;
  count: number;
  sum: number;
}

export function funnelByStatus(rows: CalcRowView[]): FunnelStage[] {
  const created = rows.length;
  const createdSum = rows.reduce((s, r) => s + Number(r.currentVersion.totalAmount), 0);

  const sentRows = rows.filter((r) => r.currentVersion.letter.sentAt);
  const approvedRows = rows.filter((r) =>
    APPROVED_LIKE.includes(r.currentVersion.status),
  );
  const signedRows = rows.filter((r) => r.currentVersion.status === 'DS_SIGNED');
  const rejectedRows = rows.filter((r) => r.currentVersion.status === 'REJECTED');

  const sum = (rs: CalcRowView[]) =>
    rs.reduce((s, r) => s + Number(r.currentVersion.totalAmount), 0);

  return [
    { key: 'created', label: 'Создан', count: created, sum: createdSum },
    { key: 'sent', label: 'Отправлен', count: sentRows.length, sum: sum(sentRows) },
    {
      key: 'approved',
      label: 'Согласован',
      count: approvedRows.length,
      sum: sum(approvedRows),
    },
    { key: 'signed', label: 'Подписан ДС', count: signedRows.length, sum: sum(signedRows) },
    { key: 'rejected', label: 'Отказ', count: rejectedRows.length, sum: sum(rejectedRows) },
  ];
}
