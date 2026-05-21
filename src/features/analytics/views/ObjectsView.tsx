import { useMemo } from 'react';
import { Card, Row, Col, Empty, Progress, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Bar } from '@ant-design/plots';
import ReactECharts from 'echarts-for-react';
import type { CalcRowView } from '@/services/calculations';
import { ObjectBadge } from '@/shared/ui/ObjectBadge';
import { MoneyCell } from '@/shared/ui/MoneyCell';
import { bucketByObject } from '../computeKpis';
import {
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_COLOR,
  ACTIVE_STATUSES,
  type StatusCode,
} from '@/shared/schemas';
import { daysBetween } from '@/shared/lib/format';

interface Props {
  rows: CalcRowView[];
}

interface ObjectRow {
  objectId: string;
  objectName: string;
  color: string;
  count: number;
  pipelineSum: number;
  signedSum: number;
  refusedSum: number;
  stuckCount: number;
  medianCycleDays: number;
  conversionRate: number;
}

const IN_WORK: StatusCode[] = ACTIVE_STATUSES;

export function ObjectsView({ rows }: Props) {
  const byObject = useMemo(() => bucketByObject(rows), [rows]);

  const stackData = useMemo(() => {
    const list: Array<{ object: string; status: string; sum: number }> = [];
    for (const o of byObject) {
      for (const s of STATUS_ORDER) {
        const v = o.statuses[s] ?? 0;
        if (v > 0) {
          list.push({
            object: o.objectName,
            status: STATUS_LABEL[s],
            sum: Math.round(v / 1_000_000),
          });
        }
      }
    }
    return list;
  }, [byObject]);

  const treemapOption = useMemo(() => {
    const byId = new Map<string, { rows: CalcRowView[]; name: string; color: string }>();
    for (const r of rows) {
      const id = r.calculation.objectId;
      let b = byId.get(id);
      if (!b) {
        b = { rows: [], name: r.objectName, color: r.objectColor };
        byId.set(id, b);
      }
      b.rows.push(r);
    }
    const data = [...byId.entries()]
      .map(([, b]) => {
        const total = b.rows.reduce((s, r) => s + Number(r.currentVersion.totalAmount), 0);
        const signed = b.rows.filter((r) => r.currentVersion.status === 'DS_SIGNED').length;
        const signedShare = b.rows.length > 0 ? signed / b.rows.length : 0;
        const color =
          signedShare > 0.5 ? '#16A34A' : signedShare > 0.2 ? '#0EA5E9' : '#9CA3AF';
        return {
          name: b.name.length > 24 ? b.name.slice(0, 24) + '…' : b.name,
          value: Math.round(total),
          itemStyle: { color, borderColor: 'white', borderWidth: 2 },
          extra: {
            count: b.rows.length,
            signed,
            signedShare: Math.round(signedShare * 100),
          },
        };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
    return {
      tooltip: {
        formatter: (p: {
          name?: string;
          value?: number;
          data?: { extra?: { count?: number; signed?: number; signedShare?: number } };
        }) =>
          `<b>${p.name}</b><br/>Сумма: ${((p.value ?? 0) / 1_000_000).toFixed(1)} млн ₽<br/>Расчётов: ${p.data?.extra?.count ?? 0}<br/>Подписано: ${p.data?.extra?.signed ?? 0} (${p.data?.extra?.signedShare ?? 0}%)`,
      },
      series: [
        {
          type: 'treemap',
          data,
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: {
            show: true,
            formatter: '{b}',
            color: 'white',
            fontWeight: 600,
          },
        },
      ],
    };
  }, [rows]);

  const tableData = useMemo<ObjectRow[]>(() => {
    const byId = new Map<string, { rows: CalcRowView[]; name: string; color: string }>();
    for (const r of rows) {
      const id = r.calculation.objectId;
      let b = byId.get(id);
      if (!b) {
        b = { rows: [], name: r.objectName, color: r.objectColor };
        byId.set(id, b);
      }
      b.rows.push(r);
    }
    const result: ObjectRow[] = [];
    for (const [id, b] of byId) {
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
      const resolved = signedSum + refusedSum;
      const conversionRate = resolved > 0 ? signedSum / resolved : 0;
      result.push({
        objectId: id,
        objectName: b.name,
        color: b.color,
        count: b.rows.length,
        pipelineSum,
        signedSum,
        refusedSum,
        stuckCount,
        medianCycleDays,
        conversionRate,
      });
    }
    return result.sort((a, b) => b.pipelineSum + b.signedSum - (a.pipelineSum + a.signedSum));
  }, [rows]);

  const columns: ColumnsType<ObjectRow> = [
    {
      title: 'Объект',
      key: 'obj',
      render: (_, r) => <ObjectBadge name={r.objectName} color={r.color} size="sm" />,
    },
    {
      title: '#',
      key: 'count',
      width: 70,
      align: 'right',
      render: (_, r) => r.count,
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: 'В работе',
      key: 'pipe',
      align: 'right',
      render: (_, r) => <MoneyCell value={r.pipelineSum} compact />,
      sorter: (a, b) => a.pipelineSum - b.pipelineSum,
    },
    {
      title: 'Подписано',
      key: 'signed',
      align: 'right',
      render: (_, r) => <MoneyCell value={r.signedSum} compact bold />,
      sorter: (a, b) => a.signedSum - b.signedSum,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Отказы',
      key: 'ref',
      align: 'right',
      render: (_, r) => <MoneyCell value={r.refusedSum} compact />,
      sorter: (a, b) => a.refusedSum - b.refusedSum,
    },
    {
      title: 'Конверсия',
      key: 'conv',
      width: 160,
      render: (_, r) => (
        <Progress
          percent={Math.round(r.conversionRate * 100)}
          size="small"
          strokeColor={r.conversionRate > 0.5 ? '#16A34A' : r.conversionRate > 0.2 ? '#0EA5E9' : '#DC2626'}
        />
      ),
      sorter: (a, b) => a.conversionRate - b.conversionRate,
    },
    {
      title: 'Зависло',
      key: 'stuck',
      width: 110,
      align: 'center',
      render: (_, r) =>
        r.stuckCount > 0 ? (
          <Tag color="error">{r.stuckCount}</Tag>
        ) : (
          <Tag color="success">0</Tag>
        ),
      sorter: (a, b) => a.stuckCount - b.stuckCount,
    },
    {
      title: 'Медиана, дн',
      key: 'med',
      width: 120,
      align: 'right',
      render: (_, r) => (r.medianCycleDays > 0 ? r.medianCycleDays : '—'),
      sorter: (a, b) => a.medianCycleDays - b.medianCycleDays,
    },
  ];

  if (rows.length === 0) {
    return (
      <Card>
        <Empty description="Нет данных по выбранным фильтрам" />
      </Card>
    );
  }

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="Распределение по объектам и статусам (₽)">
            {stackData.length === 0 ? (
              <Empty />
            ) : (
              <Bar
                data={stackData}
                xField="sum"
                yField="object"
                colorField="status"
                stack
                seriesField="status"
                height={Math.max(320, byObject.length * 28)}
                legend={{ position: 'bottom' }}
                axis={{
                  x: { labelFormatter: (v: number) => `${v}М` },
                  y: { title: null },
                }}
                scale={{
                  color: {
                    domain: STATUS_ORDER.map((s) => STATUS_LABEL[s]),
                    range: STATUS_ORDER.map((s) => STATUS_COLOR[s].text),
                  },
                }}
                tooltip={{
                  field: 'sum',
                  channel: 'y',
                  valueFormatter: (v: number) => `${v.toFixed(0)} млн ₽`,
                }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Объекты по доле подписанных" styles={{ body: { padding: 8 } }}>
            <ReactECharts option={treemapOption} style={{ height: 360 }} notMerge lazyUpdate />
          </Card>
        </Col>
      </Row>

      <Card
        title="Топ объектов: производительность"
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: 0 } }}
      >
        <Table<ObjectRow>
          dataSource={tableData}
          columns={columns}
          rowKey={(r) => r.objectId}
          size="middle"
          pagination={tableData.length > 10 ? { pageSize: 10, hideOnSinglePage: true } : false}
        />
      </Card>
    </>
  );
}
