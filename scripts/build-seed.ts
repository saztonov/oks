import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';
import {
  DbSnapshotSchema,
  type ConstructionObject,
  type RDSection,
  type RDDocument,
  type CalculationType,
  type User,
  type Calculation,
  type CalculationVersion,
  type StatusTransition,
  type StatusCode,
  type Decimal,
  type ObjectId,
  type RDSectionId,
  type RDDocumentId,
  type CalcTypeId,
  type UserId,
  type CalculationId,
  type CalcVersionId,
  type TransitionId,
} from '../src/shared/schemas/index.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const XLSX_PATH = join(ROOT, 'temp', '_Допонительные работы INJOU.xlsx');
const OUT_DIR = join(ROOT, 'src', 'shared', 'mock');
const OUT_PATH = join(OUT_DIR, 'seed.json');

const NOW_ISO = new Date('2026-05-21T00:00:00.000Z').toISOString();

function detUuid(seed: string): string {
  const h = createHash('sha256').update(seed).digest('hex');
  const variant = ((parseInt(h[16] ?? '0', 16) & 0x3) | 0x8).toString(16);
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    '4' + h.slice(13, 16),
    variant + h.slice(17, 20),
    h.slice(20, 32),
  ].join('-');
}

function clean(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/\s+/g, ' ').trim();
}

function toIsoFromCell(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + v * 86400000).toISOString();
  }
  const s = String(v).trim();
  const m = s.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const y = Number(m[3]);
    return new Date(Date.UTC(y, mo, d)).toISOString();
  }
  const t = Date.parse(s);
  return isNaN(t) ? null : new Date(t).toISOString();
}

function toDecimal(v: unknown): Decimal {
  if (v === null || v === undefined || v === '' || v === '-') return '0' as Decimal;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return '0' as Decimal;
  return n.toFixed(2) as Decimal;
}

const STATUS_MAP: Record<string, StatusCode> = {
  'ПЛАН': 'PLAN',
  'Направлено заказчику': 'SENT_TO_CUSTOMER',
  'Направлено заказчику повторно': 'SENT_AGAIN',
  'Согласовано': 'APPROVED',
  'Ушло в ДС': 'IN_DS',
  'Подписан ДС': 'DS_SIGNED',
  'Отказ': 'REJECTED',
  'Отказ, необходима повторная подача': 'REJECTED_RESUBMIT',
};

function mapStatus(raw: string): StatusCode {
  const key = clean(raw);
  return STATUS_MAP[key] ?? 'PLAN';
}

const OBJECT_COLORS: Record<string, string> = {
  'KING': '#2F6FEB',
  'INJOY': '#16A34A',
  'ЗИЛАРТ 33': '#D97706',
  'Wave': '#0EA5E9',
  'PRIMAVERA 14': '#9333EA',
  'Садовническая': '#DC2626',
  'ДОМ 56': '#0891B2',
  'ALIA': '#DB2777',
  'Событие-6.2': '#65A30D',
};

function objectColor(name: string): string {
  return OBJECT_COLORS[name] ?? '#6B7280';
}

interface RawRow {
  rowIndex: number;
  objectName: string;
  serialNo: number | null;
  versionLabel: string | null;
  calcTypeName: string;
  statusUid: string;
  statusVisible: string;
  workName: string;
  sectionRaw: string;
  rdRaw: string;
  letterNo: string;
  letterDate: string | null;
  sumTotal: unknown;
  linkOrFile: string;
  pz: unknown;
  kp: unknown;
  kpz: unknown;
  note: string;
  dsNumber: string;
  assigneeName: string;
}

function parseRows(rows: unknown[][]): RawRow[] {
  const out: RawRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const objectName = clean(r[0]);
    const serialRaw = r[1];
    if (!objectName) continue;
    const serialNo =
      typeof serialRaw === 'number'
        ? serialRaw
        : Number(clean(serialRaw)) || null;
    if (!serialNo) continue;

    out.push({
      rowIndex: i + 1,
      objectName,
      serialNo,
      versionLabel: clean(r[2]) || 'V1',
      calcTypeName: clean(r[3]),
      statusUid: clean(r[4]),
      statusVisible: clean(r[5]),
      workName: clean(r[6]),
      sectionRaw: clean(r[7]),
      rdRaw: typeof r[8] === 'string' ? r[8] : clean(r[8]),
      letterNo: clean(r[9]),
      letterDate: toIsoFromCell(r[10]),
      sumTotal: r[12],
      linkOrFile: clean(r[13]),
      pz: r[14],
      kp: r[15],
      kpz: r[16],
      note: clean(r[17]),
      dsNumber: clean(r[18]),
      assigneeName: clean(r[19]),
    });
  }
  return out;
}

function splitSections(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,/]+/)
    .map((s) => clean(s))
    .filter((s) => s && s !== '-')
    .map((s) => s.toUpperCase());
}

function parseRdCodes(raw: string): string[] {
  if (!raw) return [];
  const out = new Set<string>();
  raw.split(/[\n;]+/).forEach((line) => {
    const trimmed = clean(line).replace(/^[,\s-]+|[,\s-]+$/g, '');
    if (!trimmed) return;
    const code = trimmed
      .replace(/\(?\s*от\s+\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4}\s*\)?\.?/gi, '')
      .replace(/\bВПР\b.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[,;.]+$/, '');
    if (code && code.length > 1 && code.length <= 200) out.add(code);
  });
  return [...out];
}

function normalizeCalcType(raw: string): string {
  if (!raw) return 'Не указан';
  return clean(raw).replace(/,\s*/g, ', ').replace(/\s+/g, ' ');
}

async function main() {
  if (!existsSync(XLSX_PATH)) {
    console.error(`Excel not found at ${XLSX_PATH}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(XLSX_PATH, { cellDates: true });
  const sheet = wb.Sheets['Сводная (копия)'];
  if (!sheet) {
    console.error('Sheet "Сводная (копия)" not found');
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  const raw = parseRows(rows);
  console.log(`Parsed ${raw.length} non-empty rows`);

  // -------- Objects --------
  const objectsMap = new Map<string, ConstructionObject>();
  for (const r of raw) {
    if (!objectsMap.has(r.objectName)) {
      const id = detUuid(`obj:${r.objectName}`) as ObjectId;
      objectsMap.set(r.objectName, {
        id,
        code: r.objectName,
        name: r.objectName,
        color: objectColor(r.objectName),
        isActive: true,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      });
    }
  }
  const objects = [...objectsMap.values()];

  // -------- Sections --------
  const sectionMap = new Map<string, RDSection>();
  for (const r of raw) {
    for (const code of splitSections(r.sectionRaw)) {
      if (!sectionMap.has(code)) {
        sectionMap.set(code, {
          id: detUuid(`sec:${code}`) as RDSectionId,
          code,
          name: code,
          createdAt: NOW_ISO,
          updatedAt: NOW_ISO,
        });
      }
    }
  }
  for (const def of ['АР', 'КЖ', 'СС', 'ЭОМ', 'ВК', 'ОВ', 'ГП', 'КМ', 'ВТ', 'ГИ', 'АИ', 'ТХ', 'КР']) {
    if (!sectionMap.has(def)) {
      sectionMap.set(def, {
        id: detUuid(`sec:${def}`) as RDSectionId,
        code: def,
        name: def,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      });
    }
  }
  const sections = [...sectionMap.values()];

  // -------- RD Documents --------
  const rdMap = new Map<string, RDDocument>();
  for (const r of raw) {
    const obj = objectsMap.get(r.objectName)!;
    const codes = parseRdCodes(r.rdRaw);
    const rowSections = splitSections(r.sectionRaw);
    const primarySectionCode = rowSections[0];
    const primarySection = primarySectionCode ? sectionMap.get(primarySectionCode) : undefined;
    for (const code of codes) {
      const key = `${obj.code}|${code}`;
      if (!rdMap.has(key)) {
        rdMap.set(key, {
          id: detUuid(`rd:${obj.code}:${code}`) as RDDocumentId,
          code,
          name: '',
          objectId: obj.id,
          sectionId: primarySection?.id ?? null,
          issueDate: null,
          hasExtraWork: true,
          createdAt: NOW_ISO,
          updatedAt: NOW_ISO,
        });
      } else if (!rdMap.get(key)!.hasExtraWork) {
        rdMap.get(key)!.hasExtraWork = true;
      }
    }
  }
  const rdDocuments = [...rdMap.values()];

  // -------- Calc Types --------
  const ctypeMap = new Map<string, CalculationType>();
  for (const r of raw) {
    const t = normalizeCalcType(r.calcTypeName);
    if (!ctypeMap.has(t)) {
      ctypeMap.set(t, {
        id: detUuid(`ctype:${t}`) as CalcTypeId,
        code: t,
        name: t,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      });
    }
  }
  const calcTypes = [...ctypeMap.values()];

  // -------- Users --------
  const userMap = new Map<string, User>();
  const SAMPLE_EMPLOYEE = 'Иванов Иван Сергеевич';
  const SAMPLE_MANAGER = 'Петров Сергей Александрович';
  userMap.set(SAMPLE_EMPLOYEE, {
    id: detUuid(`user:${SAMPLE_EMPLOYEE}`) as UserId,
    fullName: SAMPLE_EMPLOYEE,
    email: 'ivanov@example.local',
    role: 'EMPLOYEE',
    isActive: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  });
  userMap.set(SAMPLE_MANAGER, {
    id: detUuid(`user:${SAMPLE_MANAGER}`) as UserId,
    fullName: SAMPLE_MANAGER,
    email: 'petrov@example.local',
    role: 'MANAGER',
    isActive: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  });

  for (const r of raw) {
    const name = r.assigneeName;
    if (!name) continue;
    if (!userMap.has(name)) {
      userMap.set(name, {
        id: detUuid(`user:${name}`) as UserId,
        fullName: name,
        email: null,
        role: 'EMPLOYEE',
        isActive: true,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      });
    }
  }
  const users = [...userMap.values()];

  // -------- Group rows by (object, serialNo, version) --------
  type GroupKey = string;
  const groups = new Map<GroupKey, RawRow[]>();
  for (const r of raw) {
    const obj = objectsMap.get(r.objectName)!;
    const key = `${obj.code}#${r.serialNo}#${r.versionLabel}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }

  // -------- Calculations & Versions --------
  // 1) Сгруппировать строки по уникальному расчёту (objectName + serialNo)
  // 2) Внутри каждой группы — версии (V1, V2, ...)
  // Атрибуты расчёта (тип, разделы, шифры, наименование, ответственный)
  // берутся из последней версии, т.к. они не должны меняться
  type CalcGroupKey = string;
  const calcGroups = new Map<CalcGroupKey, RawRow[]>();
  for (const r of raw) {
    const obj = objectsMap.get(r.objectName)!;
    const key = `${obj.code}#${r.serialNo}`;
    const arr = calcGroups.get(key) ?? [];
    arr.push(r);
    calcGroups.set(key, arr);
  }

  const calculations: Calculation[] = [];
  const versions: CalculationVersion[] = [];
  const transitions: StatusTransition[] = [];
  const managerId = userMap.get(SAMPLE_MANAGER)!.id;

  for (const [calcKey, calcRows] of calcGroups) {
    // Группируем строки по версии
    const byVersion = new Map<string, RawRow[]>();
    for (const r of calcRows) {
      const v = r.versionLabel || 'V1';
      const arr = byVersion.get(v) ?? [];
      arr.push(r);
      byVersion.set(v, arr);
    }

    // Для каждой версии — представитель с максимальной суммой
    const versionReprs = [...byVersion.entries()]
      .map(([label, rows]) => {
        const repr = rows.reduce((best, cur) => {
          const bs = Number(toDecimal(best.sumTotal));
          const cs = Number(toDecimal(cur.sumTotal));
          return cs > bs ? cur : best;
        }, rows[0]);
        return { label, no: Number(label.replace(/\D/g, '')) || 1, repr };
      })
      .sort((a, b) => a.no - b.no);

    if (versionReprs.length === 0) continue;
    const latest = versionReprs[versionReprs.length - 1].repr;
    const obj = objectsMap.get(latest.objectName)!;
    const calcId = detUuid(`calc:${calcKey}`) as CalculationId;

    // Атрибуты уровня расчёта (берём из последней версии)
    const ctype = ctypeMap.get(normalizeCalcType(latest.calcTypeName))!;
    const sectionCodes = splitSections(latest.sectionRaw);
    const sectionIds: RDSectionId[] = sectionCodes
      .map((c) => sectionMap.get(c)?.id)
      .filter((x): x is RDSectionId => !!x);
    // Шифры РД — объединение по всем версиям
    const allRdCodes = new Set<string>();
    for (const r of calcRows) {
      for (const c of parseRdCodes(r.rdRaw)) allRdCodes.add(c);
    }
    const sourceRdIds: RDDocumentId[] = [...allRdCodes]
      .map((c) => rdMap.get(`${obj.code}|${c}`)?.id)
      .filter((x): x is RDDocumentId => !!x);

    const assigneeId = latest.assigneeName
      ? userMap.get(latest.assigneeName)?.id ?? userMap.get(SAMPLE_EMPLOYEE)!.id
      : userMap.get(SAMPLE_EMPLOYEE)!.id;
    const workName = latest.workName || `Расчёт №${latest.serialNo}`;

    // Создаём версии
    const versionRecords: CalculationVersion[] = [];
    for (const { label, no, repr } of versionReprs) {
      const versionId = detUuid(`ver:${calcKey}:${label}`) as CalcVersionId;
      const total = toDecimal(repr.sumTotal);
      const pz = toDecimal(repr.pz);
      const totalNum = Number(total);
      const pzNum = Number(pz);
      let coeff: Decimal;
      let directCost: Decimal;
      if (pzNum > 0 && totalNum > 0) {
        directCost = pz;
        coeff = (totalNum / pzNum).toFixed(4) as Decimal;
      } else if (totalNum > 0) {
        coeff = '1.2200' as Decimal;
        directCost = (totalNum / 1.22).toFixed(2) as Decimal;
      } else {
        coeff = '1.2200' as Decimal;
        directCost = '0.00' as Decimal;
      }

      const status = mapStatus(repr.statusUid || repr.statusVisible);
      const note = [repr.note].filter(Boolean).join('\n');
      const baseDate = repr.letterDate ?? NOW_ISO;

      const ver: CalculationVersion = {
        id: versionId,
        calculationId: calcId,
        versionNo: no,
        versionLabel: label,
        directCost,
        overheadCoeff: coeff,
        totalAmount: total,
        letter: {
          outgoingNumber: repr.letterNo || null,
          sentAt: repr.letterDate,
        },
        attachments: [],
        status,
        dsNumber: repr.dsNumber || null,
        note,
        createdAt: baseDate,
        updatedAt: baseDate,
        createdBy: assigneeId,
      };
      versionRecords.push(ver);
      versions.push(ver);

      // Transitions
      transitions.push({
        id: detUuid(`tr:${versionId}:PLAN->INIT`) as TransitionId,
        versionId,
        fromStatus: null,
        toStatus: 'PLAN',
        performedBy: assigneeId,
        performedAt: baseDate,
        comment: 'Импорт из Excel',
      });
      if (status !== 'PLAN') {
        transitions.push({
          id: detUuid(`tr:${versionId}:PLAN->${status}`) as TransitionId,
          versionId,
          fromStatus: 'PLAN',
          toStatus: status,
          performedBy: managerId,
          performedAt: baseDate,
          comment: '',
        });
      }
    }

    const currentVersion = versionRecords[versionRecords.length - 1];

    const calc: Calculation = {
      id: calcId,
      objectId: obj.id,
      serialNo: latest.serialNo!,
      calcTypeId: ctype?.id ?? null,
      sectionIds,
      sourceRdIds,
      workName,
      assigneeId,
      currentVersionId: currentVersion.id,
      createdAt: NOW_ISO,
      updatedAt: currentVersion.updatedAt,
    };
    calculations.push(calc);
  }

  const snapshot = {
    schemaVersion: 2 as const,
    objects,
    sections,
    rdDocuments,
    calcTypes,
    users,
    calculations,
    versions,
    transitions,
  };

  // Validate
  const parsed = DbSnapshotSchema.safeParse(snapshot);
  if (!parsed.success) {
    console.error('Validation failed:');
    console.error(JSON.stringify(parsed.error.issues.slice(0, 10), null, 2));
    process.exit(1);
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(parsed.data, null, 2), 'utf8');
  console.log(`\nSeed written to ${OUT_PATH}`);
  console.log(
    `  objects: ${objects.length}\n  sections: ${sections.length}\n  rdDocs: ${rdDocuments.length}\n  calcTypes: ${calcTypes.length}\n  users: ${users.length}\n  calculations: ${calculations.length}\n  versions: ${versions.length}\n  transitions: ${transitions.length}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
