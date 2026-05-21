import { useMemo, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Empty,
  Space,
  Progress,
  Segmented,
  Button,
  Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { Area } from '@ant-design/plots';
import {
  TrendingUp,
  TrendingDown,
  Coins,
  Clock4,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatusTag } from '@/shared/ui/StatusTag';
import { ObjectBadge } from '@/shared/ui/ObjectBadge';
import { MoneyCell } from '@/shared/ui/MoneyCell';
import { useCalculations } from '@/services/hooks';
import { useUiStore } from '@/app/stores/uiStore';
import {
  computeKpis,
  cumulativeSignedByMonth,
} from '@/features/analytics/computeKpis';
import { formatMoney } from '@/entities/calculation/compute';
import { ACTIVE_STATUSES } from '@/shared/schemas';
import { daysBetween } from '@/shared/lib/format';
import type { CalcRowView } from '@/services/calculations';
import { AnalyticsFiltersPanel } from '@/features/analytics/AnalyticsFiltersPanel';
import {
  EMPTY_ANALYTICS_FILTERS,
  countActiveAnalyticsFilters,
  toServiceFilters,
  type AnalyticsFilters,
  type AnalyticsMode,
} from '@/features/analytics/types';
import { ObjectsView } from '@/features/analytics/views/ObjectsView';
import { EmployeesView } from '@/features/analytics/views/EmployeesView';
import { StatusesView } from '@/features/analytics/views/StatusesView';

export function AnalyticsPage() {
  const navigate = useNavigate();
  const role = useUiStore((s) => s.role);

  const [mode, setMode] = useState<AnalyticsMode>('objects');
  const [filters, setFilters] = useState<AnalyticsFilters>(EMPTY_ANALYTICS_FILTERS);
  const serviceFilters = useMemo(() => toServiceFilters(filters), [filters]);
  const { data: rows = [] } = useCalculations(serviceFilters);

  const kpis = useMemo(() => computeKpis(rows), [rows]);
  const cumSigned = useMemo(() => cumulativeSignedByMonth(rows), [rows]);
  const active = countActiveAnalyticsFilters(filters);

  const actionRequired = useMemo<CalcRowView[]>(() => {
    return rows
      .filter((r) => ACTIVE_STATUSES.includes(r.currentVersion.status))
      .map((r) => ({
        r,
        score:
          daysBetween(r.currentVersion.updatedAt) *
          Math.log10(1 + Number(r.currentVersion.totalAmount)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.r);
  }, [rows]);

  const actionColumns: ColumnsType<CalcRowView> = [
    {
      title: '№',
      key: 'num',
      width: 90,
      render: (_, r) => (
        <span style={{ fontWeight: 600 }}>
          №{r.calculation.serialNo} {r.currentVersion.versionLabel}
        </span>
      ),
    },
    {
      title: 'Объект',
      key: 'obj',
      width: 150,
      render: (_, r) => <ObjectBadge name={r.objectName} color={r.objectColor} size="sm" />,
    },
    {
      title: 'Сумма',
      key: 'sum',
      width: 130,
      align: 'right',
      render: (_, r) => <MoneyCell value={r.currentVersion.totalAmount} compact bold />,
    },
    {
      title: 'Статус',
      key: 'status',
      width: 200,
      render: (_, r) => <StatusTag status={r.currentVersion.status} small />,
    },
    {
      title: 'Дней без движения',
      key: 'days',
      width: 140,
      render: (_, r) => {
        const days = daysBetween(r.currentVersion.updatedAt);
        const color = days > 60 ? '#DC2626' : days > 30 ? '#D97706' : '#16A34A';
        return (
          <Space>
            <span style={{ fontWeight: 600, color }}>{days}</span>
            <Progress
              percent={Math.min(100, (days / 90) * 100)}
              showInfo={false}
              size="small"
              strokeColor={color}
              style={{ width: 60 }}
            />
          </Space>
        );
      },
      sorter: (a, b) =>
        daysBetween(a.currentVersion.updatedAt) - daysBetween(b.currentVersion.updatedAt),
    },
    {
      title: 'Ответственный',
      key: 'who',
      width: 180,
      render: (_, r) => r.assigneeName ?? '—',
    },
  ];

  if (role !== 'MANAGER') {
    return (
      <>
        <PageHeader title="Аналитика" />
        <Alert
          type="info"
          showIcon
          message="Раздел доступен только руководителю"
          description="Переключитесь на роль «Руководитель» в шапке, чтобы увидеть аналитику."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Аналитика"
        subtitle="Сводная картина по всем расчётам и объектам"
        extra={
          <Space>
            <Segmented<AnalyticsMode>
              value={mode}
              onChange={(v) => setMode(v as AnalyticsMode)}
              options={[
                { label: 'Объекты', value: 'objects' },
                { label: 'Сотрудники', value: 'employees' },
                { label: 'Статусы', value: 'statuses' },
              ]}
            />
            {active > 0 && (
              <Button
                size="middle"
                icon={<RotateCcw size={14} />}
                onClick={() => setFilters(EMPTY_ANALYTICS_FILTERS)}
              >
                Сбросить
              </Button>
            )}
          </Space>
        }
      />

      <AnalyticsFiltersPanel value={filters} onChange={setFilters} />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic
              title={
                <Space>
                  <Coins size={14} style={{ color: '#0EA5E9' }} /> В работе (₽)
                </Space>
              }
              value={kpis.pipelineValue}
              formatter={(v) => formatMoney(v as number, { compact: true })}
              valueStyle={{ color: '#0369A1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic
              title={
                <Space>
                  <CheckCircle2 size={14} style={{ color: '#16A34A' }} /> Подписано ДС (₽)
                </Space>
              }
              value={kpis.signedValue}
              formatter={(v) => formatMoney(v as number, { compact: true })}
              valueStyle={{ color: '#16A34A' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic
              title={
                <Space>
                  <TrendingUp size={14} style={{ color: '#16A34A' }} /> Конверсия (₽)
                </Space>
              }
              value={kpis.conversionRate * 100}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#16A34A' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic
              title={
                <Space>
                  <Clock4 size={14} style={{ color: '#D97706' }} /> Медиана цикла
                </Space>
              }
              value={kpis.medianCycleDays}
              suffix="дн"
              valueStyle={{ color: '#D97706' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic
              title={
                <Space>
                  <AlertTriangle size={14} style={{ color: '#DC2626' }} /> Зависло &gt;30 дней
                </Space>
              }
              value={kpis.stuckCount}
              valueStyle={{ color: kpis.stuckCount > 0 ? '#DC2626' : '#16A34A' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Card>
            <Statistic
              title={
                <Space>
                  <TrendingDown size={14} style={{ color: '#DC2626' }} /> Отказы (₽)
                </Space>
              }
              value={kpis.refusalValue}
              formatter={(v) => formatMoney(v as number, { compact: true })}
              valueStyle={{ color: '#DC2626' }}
            />
          </Card>
        </Col>
      </Row>

      {mode === 'objects' && <ObjectsView rows={rows} />}
      {mode === 'employees' && <EmployeesView rows={rows} />}
      {mode === 'statuses' && <StatusesView rows={rows} />}

      <Card title="Накопительные подписания ДС" style={{ marginBottom: 16 }}>
        {cumSigned.length === 0 ? (
          <Empty />
        ) : (
          <Area
            data={cumSigned.map((d) => ({
              ...d,
              sum: d.sum / 1_000_000,
              cumulative: d.cumulative / 1_000_000,
            }))}
            xField="month"
            yField="cumulative"
            shapeField="smooth"
            height={300}
            style={{ fill: 'l(270) 0:#ffffff 1:#2F6FEB' }}
            axis={{
              y: { labelFormatter: (v: number) => `${v.toFixed(0)} млн` },
            }}
            tooltip={{
              field: 'cumulative',
              valueFormatter: (v: number) => `${v.toFixed(1)} млн ₽`,
            }}
          />
        )}
      </Card>

      <Card title="Требуют действия (топ-10)" styles={{ body: { padding: 0 } }}>
        {actionRequired.length === 0 ? (
          <div style={{ padding: 48 }}>
            <Empty description="Нет зависших расчётов" />
          </div>
        ) : (
          <Table<CalcRowView>
            dataSource={actionRequired}
            columns={actionColumns}
            rowKey={(r) => r.calculation.id}
            size="middle"
            pagination={false}
            onRow={(r) => ({
              onClick: () => navigate(`/registry/${r.calculation.id}`),
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </Card>
    </>
  );
}
