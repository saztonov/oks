import { useMemo } from 'react';
import { Card, Row, Col, Statistic, Empty, Table, Tag, Button, Space, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Plus, Sparkles, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatusTag } from '@/shared/ui/StatusTag';
import { MoneyCell } from '@/shared/ui/MoneyCell';
import { ObjectScopeSelector, ObjectScopeEmpty } from '@/shared/ui/ObjectScopeSelector';
import { useCalculations } from '@/services/hooks';
import { useCurrentUser, useUiStore } from '@/app/stores/uiStore';
import { ACTIVE_STATUSES, STATUS_LABEL, TERMINAL_STATUSES, type ObjectId } from '@/shared/schemas';
import { formatMoney } from '@/entities/calculation/compute';
import type { CalcRowView } from '@/services/calculations';
import { daysBetween, formatDate } from '@/shared/lib/format';

export function MyPage() {
  const role = useUiStore((s) => s.role);
  const selectedObjectId = useUiStore((s) => s.selectedObjectId);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { data: allRows = [] } = useCalculations(
    selectedObjectId ? { objectIds: [selectedObjectId as ObjectId] } : {},
  );

  const myRows = useMemo(() => {
    if (!user || !selectedObjectId) return [];
    return allRows.filter((r) => r.calculation.assigneeId === user.id);
  }, [allRows, user, selectedObjectId]);

  const stats = useMemo(() => {
    const active = myRows.filter((r) => ACTIVE_STATUSES.includes(r.currentVersion.status));
    const signedQuarter = myRows.filter(
      (r) =>
        r.currentVersion.status === 'DS_SIGNED' &&
        dayjs(r.currentVersion.updatedAt).isAfter(dayjs().subtract(3, 'month')),
    );
    const inWorkSum = active.reduce((s, r) => s + Number(r.currentVersion.totalAmount), 0);
    const signedSum = signedQuarter.reduce((s, r) => s + Number(r.currentVersion.totalAmount), 0);
    const stuck = active.filter((r) => daysBetween(r.currentVersion.updatedAt) > 30);
    return {
      activeCount: active.length,
      inWorkSum,
      signedCount: signedQuarter.length,
      signedSum,
      stuckCount: stuck.length,
      stuck,
    };
  }, [myRows]);

  const activeColumns: ColumnsType<CalcRowView> = [
    {
      title: '№',
      key: 'num',
      width: 100,
      render: (_, r) => (
        <span style={{ fontWeight: 600 }}>
          №{r.calculation.serialNo}{' '}
          <span style={{ color: '#9CA3AF', fontWeight: 400 }}>
            {r.currentVersion.versionLabel}
          </span>
        </span>
      ),
    },
    {
      title: 'Наименование',
      key: 'name',
      ellipsis: true,
      render: (_, r) => r.calculation.workName,
    },
    {
      title: 'Сумма, ₽',
      key: 'sum',
      width: 130,
      align: 'right',
      render: (_, r) => <MoneyCell value={r.currentVersion.totalAmount} compact />,
    },
    {
      title: 'Статус',
      key: 'status',
      width: 120,
      align: 'center',
      render: (_, r) => <StatusTag status={r.currentVersion.status} multiline />,
    },
    {
      title: 'Обновлён',
      key: 'updated',
      width: 110,
      render: (_, r) => (
        <span style={{ color: '#6B7280', fontSize: 12 }}>{formatDate(r.currentVersion.updatedAt)}</span>
      ),
    },
  ];

  const activeRows = useMemo(
    () => myRows.filter((r) => !TERMINAL_STATUSES.has(r.currentVersion.status)),
    [myRows],
  );

  if (role !== 'EMPLOYEE') {
    return (
      <Alert
        type="info"
        showIcon
        message="Эта страница доступна только в роли «Сотрудник»"
        action={
          <Button type="primary" onClick={() => navigate('/analytics')}>
            Перейти в аналитику
          </Button>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title={`Здравствуйте, ${user?.fullName?.split(' ').slice(1, 2).join(' ') ?? 'сотрудник'}`}
        subtitle={
          selectedObjectId
            ? 'Ваши расчёты по выбранному объекту'
            : 'Выберите объект, чтобы увидеть свои расчёты'
        }
        extra={
          <Space size={8}>
            <ObjectScopeSelector />
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => navigate('/registry/new')}
              disabled={!selectedObjectId}
            >
              Новый расчёт
            </Button>
          </Space>
        }
      />

      {!selectedObjectId ? (
        <ObjectScopeEmpty description="Личный кабинет показывает только ваши расчёты в рамках выбранного объекта" />
      ) : (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={
                    <Space>
                      <Sparkles size={14} style={{ color: '#0EA5E9' }} /> Активных у меня
                    </Space>
                  }
                  value={stats.activeCount}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={
                    <Space>
                      <Clock size={14} style={{ color: '#D97706' }} /> Сумма в работе
                    </Space>
                  }
                  value={stats.inWorkSum}
                  formatter={(v) => formatMoney(v as number, { compact: true })}
                  valueStyle={{ color: '#D97706' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={
                    <Space>
                      <CheckCircle2 size={14} style={{ color: '#16A34A' }} /> Подписано за квартал
                    </Space>
                  }
                  value={stats.signedCount}
                  suffix={
                    <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 400 }}>
                      ({formatMoney(stats.signedSum, { compact: true })})
                    </span>
                  }
                  valueStyle={{ color: '#16A34A' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={
                    <Space>
                      <AlertCircle size={14} style={{ color: '#DC2626' }} /> Зависло &gt;30 дней
                    </Space>
                  }
                  value={stats.stuckCount}
                  valueStyle={{ color: stats.stuckCount > 0 ? '#DC2626' : '#16A34A' }}
                />
              </Card>
            </Col>
          </Row>

          {stats.stuck.length > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message={`У вас ${stats.stuck.length} расчёт(ов) без движения более 30 дней`}
              description={
                <Space size={6} wrap style={{ marginTop: 6 }}>
                  {stats.stuck.slice(0, 6).map((r) => (
                    <Tag
                      key={r.calculation.id}
                      color="orange"
                      onClick={() => navigate(`/registry/${r.calculation.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      №{r.calculation.serialNo} · {STATUS_LABEL[r.currentVersion.status]}
                    </Tag>
                  ))}
                </Space>
              }
            />
          )}

          <Card title={`Мои активные расчёты (${activeRows.length})`} styles={{ body: { padding: 0 } }}>
            {activeRows.length === 0 ? (
              <div style={{ padding: 48 }}>
                <Empty description="Нет активных расчётов" />
              </div>
            ) : (
              <Table<CalcRowView>
                dataSource={activeRows}
                columns={activeColumns}
                rowKey={(r) => r.calculation.id}
                size="middle"
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                onRow={(r) => ({
                  onClick: () => navigate(`/registry/${r.calculation.id}`),
                  style: { cursor: 'pointer' },
                })}
              />
            )}
          </Card>
        </>
      )}
    </>
  );
}
