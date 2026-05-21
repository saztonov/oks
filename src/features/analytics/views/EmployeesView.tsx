import { useMemo } from 'react';
import { Card, Row, Col, Empty, Progress, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Bar } from '@ant-design/plots';
import type { CalcRowView } from '@/services/calculations';
import { MoneyCell } from '@/shared/ui/MoneyCell';
import { bucketByAssignee, type AssigneeBucket } from '../computeKpis';

interface Props {
  rows: CalcRowView[];
}

export function EmployeesView({ rows }: Props) {
  const buckets = useMemo(() => bucketByAssignee(rows), [rows]);

  const signedTop = useMemo(
    () =>
      [...buckets]
        .filter((b) => b.signedSum > 0)
        .sort((a, b) => b.signedSum - a.signedSum)
        .slice(0, 10)
        .map((b) => ({
          name: b.assigneeName,
          sum: Math.round(b.signedSum / 1_000_000),
        })),
    [buckets],
  );

  const pipelineData = useMemo(
    () =>
      [...buckets]
        .filter((b) => b.pipelineSum > 0)
        .sort((a, b) => b.pipelineSum - a.pipelineSum)
        .slice(0, 10)
        .map((b) => ({
          name: b.assigneeName,
          sum: Math.round(b.pipelineSum / 1_000_000),
          stuck: b.stuckCount > 0 ? `Зависло: ${b.stuckCount}` : 'Без зависших',
        })),
    [buckets],
  );

  const columns: ColumnsType<AssigneeBucket> = [
    {
      title: 'Сотрудник',
      key: 'name',
      render: (_, r) => (
        <span style={{ fontWeight: 500, color: r.assigneeId ? '#111827' : '#9CA3AF' }}>
          {r.assigneeName}
        </span>
      ),
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
      render: (_, r) => {
        const resolved = r.signedSum + r.refusedSum;
        const rate = resolved > 0 ? r.signedSum / resolved : 0;
        return (
          <Progress
            percent={Math.round(rate * 100)}
            size="small"
            strokeColor={rate > 0.5 ? '#16A34A' : rate > 0.2 ? '#0EA5E9' : '#DC2626'}
          />
        );
      },
      sorter: (a, b) => {
        const ra = a.signedSum + a.refusedSum > 0 ? a.signedSum / (a.signedSum + a.refusedSum) : 0;
        const rb = b.signedSum + b.refusedSum > 0 ? b.signedSum / (b.signedSum + b.refusedSum) : 0;
        return ra - rb;
      },
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
        <Col xs={24} lg={12}>
          <Card title="Подписано ₽ по сотруднику (топ-10)">
            {signedTop.length === 0 ? (
              <Empty />
            ) : (
              <Bar
                data={signedTop}
                xField="sum"
                yField="name"
                height={Math.max(280, signedTop.length * 36)}
                axis={{
                  x: { labelFormatter: (v: number) => `${v}М` },
                  y: { title: null },
                }}
                style={{ fill: '#16A34A' }}
                tooltip={{
                  field: 'sum',
                  valueFormatter: (v: number) => `${v.toFixed(0)} млн ₽`,
                }}
                legend={false}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="В работе ₽ по сотруднику (топ-10)">
            {pipelineData.length === 0 ? (
              <Empty />
            ) : (
              <Bar
                data={pipelineData}
                xField="sum"
                yField="name"
                colorField="stuck"
                height={Math.max(280, pipelineData.length * 36)}
                axis={{
                  x: { labelFormatter: (v: number) => `${v}М` },
                  y: { title: null },
                }}
                legend={{ position: 'bottom' }}
                scale={{
                  color: {
                    domain: ['Без зависших', 'Зависло: 1', 'Зависло: 2', 'Зависло: 3', 'Зависло: 4', 'Зависло: 5'],
                  },
                }}
                tooltip={{
                  field: 'sum',
                  valueFormatter: (v: number) => `${v.toFixed(0)} млн ₽`,
                }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title="Производительность сотрудников"
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: 0 } }}
      >
        <Table<AssigneeBucket>
          dataSource={buckets}
          columns={columns}
          rowKey={(r) => r.assigneeId ?? '__unassigned__'}
          size="middle"
          pagination={buckets.length > 10 ? { pageSize: 10, hideOnSinglePage: true } : false}
        />
      </Card>
    </>
  );
}
