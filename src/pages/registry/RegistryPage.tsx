import { useMemo, useState } from 'react';
import { Card, Table, Button, Empty, Skeleton, Tag, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Plus, Eye, FileText } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatusTag } from '@/shared/ui/StatusTag';
import { MoneyCell } from '@/shared/ui/MoneyCell';
import { ObjectScopeSelector, ObjectScopeEmpty } from '@/shared/ui/ObjectScopeSelector';
import { FiltersPanel } from '@/features/calculation-table/FiltersPanel';
import {
  EMPTY_FILTERS,
  toServiceFilters,
  type RegistryFilterState,
} from '@/features/calculation-table/filters';
import { useCalculations } from '@/services/hooks';
import { useUiStore } from '@/app/stores/uiStore';
import type { CalcRowView } from '@/services/calculations';
import type { ObjectId } from '@/shared/schemas';

interface Group {
  key: string;
  representative: CalcRowView;
  versions: CalcRowView[];
}

function groupVersions(rows: CalcRowView[]): Group[] {
  const map = new Map<string, CalcRowView[]>();
  for (const r of rows) {
    const k = `${r.calculation.objectId}#${r.calculation.serialNo}`;
    const arr = map.get(k) ?? [];
    arr.push(r);
    map.set(k, arr);
  }
  return [...map.values()]
    .map((arr): Group => {
      arr.sort((a, b) => b.currentVersion.versionNo - a.currentVersion.versionNo);
      return {
        key: `${arr[0].calculation.objectId}#${arr[0].calculation.serialNo}`,
        representative: arr[0],
        versions: arr,
      };
    })
    .sort((a, b) => {
      const aDate = a.representative.currentVersion.updatedAt;
      const bDate = b.representative.currentVersion.updatedAt;
      return bDate.localeCompare(aDate);
    });
}

export function RegistryPage() {
  const [filters, setFilters] = useState<RegistryFilterState>(EMPTY_FILTERS);
  const navigate = useNavigate();
  const role = useUiStore((s) => s.role);
  const selectedObjectId = useUiStore((s) => s.selectedObjectId);

  if (role === 'EMPLOYEE') {
    return <Navigate to="/my" replace />;
  }

  const serviceFilters = useMemo(
    () => ({
      ...toServiceFilters(filters),
      objectIds: selectedObjectId ? [selectedObjectId as ObjectId] : undefined,
    }),
    [filters, selectedObjectId],
  );

  const { data: rows, isLoading } = useCalculations(serviceFilters);
  const groups = useMemo(
    () => (selectedObjectId && rows ? groupVersions(rows) : []),
    [rows, selectedObjectId],
  );

  const totalSum = useMemo(
    () => groups.reduce((s, g) => s + Number(g.representative.currentVersion.totalAmount), 0),
    [groups],
  );

  const columns: ColumnsType<Group> = [
    {
      title: '№',
      key: 'serial',
      width: 88,
      render: (_, g) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: '#111827' }}>
            №{g.representative.calculation.serialNo}
          </span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>
            {g.representative.currentVersion.versionLabel}
            {g.versions.length > 1 && ` из ${g.versions.length}`}
          </span>
        </div>
      ),
      sorter: (a, b) =>
        a.representative.calculation.serialNo - b.representative.calculation.serialNo,
    },
    {
      title: 'Тип',
      dataIndex: ['representative', 'calcTypeName'],
      key: 'type',
      width: 220,
      ellipsis: true,
      render: (_, g) => (
        <span style={{ color: '#374151', fontSize: 13 }}>
          {g.representative.calcTypeName ?? '—'}
        </span>
      ),
    },
    {
      title: 'Разделы',
      key: 'sections',
      width: 130,
      render: (_, g) => (
        <Space size={4} wrap>
          {g.representative.sectionCodes.slice(0, 3).map((s) => (
            <Tag key={s} style={{ margin: 0, fontSize: 11 }}>
              {s}
            </Tag>
          ))}
          {g.representative.sectionCodes.length > 3 && (
            <Tag style={{ margin: 0, fontSize: 11 }}>
              +{g.representative.sectionCodes.length - 3}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Наименование',
      key: 'name',
      ellipsis: { showTitle: true },
      render: (_, g) => (
        <span style={{ color: '#374151' }}>{g.representative.calculation.workName}</span>
      ),
    },
    {
      title: 'Сумма, ₽',
      key: 'total',
      width: 130,
      align: 'right',
      render: (_, g) => (
        <MoneyCell value={g.representative.currentVersion.totalAmount} compact bold />
      ),
      sorter: (a, b) =>
        Number(a.representative.currentVersion.totalAmount) -
        Number(b.representative.currentVersion.totalAmount),
    },
    {
      title: 'Статус',
      key: 'status',
      width: 120,
      align: 'center',
      render: (_, g) => <StatusTag status={g.representative.currentVersion.status} multiline />,
    },
    {
      title: 'Ответственный',
      key: 'assignee',
      width: 170,
      render: (_, g) => (
        <span style={{ color: '#374151', fontSize: 13 }}>
          {g.representative.assigneeName ?? '—'}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      fixed: 'right',
      render: (_, g) => (
        <Button
          type="text"
          icon={<Eye size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/registry/${g.representative.calculation.id}`);
          }}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Реестр расчётов"
        subtitle={
          selectedObjectId
            ? groups.length > 0
              ? `Найдено: ${groups.length}, общая сумма: ${totalSum.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`
              : 'По выбранному объекту расчётов нет'
            : 'Выберите объект, чтобы увидеть расчёты'
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
        <ObjectScopeEmpty />
      ) : (
        <>
          <FiltersPanel value={filters} onChange={setFilters} />

          <Card styles={{ body: { padding: 0 } }}>
            {isLoading ? (
              <div style={{ padding: 24 }}>
                <Skeleton active paragraph={{ rows: 6 }} />
              </div>
            ) : groups.length === 0 ? (
              <div style={{ padding: 48 }}>
                <Empty
                  image={<FileText size={48} style={{ color: '#D1D5DB' }} />}
                  description={
                    <div>
                      <div style={{ fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                        Расчёты не найдены
                      </div>
                      <div style={{ color: '#9CA3AF', fontSize: 13 }}>
                        Измените фильтры или создайте новый расчёт
                      </div>
                    </div>
                  }
                />
              </div>
            ) : (
              <Table<Group>
                dataSource={groups}
                columns={columns}
                rowKey="key"
                size="middle"
                sticky
                scroll={{ x: 1100 }}
                pagination={{
                  defaultPageSize: 25,
                  pageSizeOptions: [10, 25, 50, 100],
                  showSizeChanger: true,
                  showTotal: (t, [from, to]) => `${from}–${to} из ${t}`,
                }}
                expandable={{
                  rowExpandable: (g) => g.versions.length > 1,
                  expandedRowRender: (g) => (
                    <div style={{ paddingLeft: 32, paddingTop: 4, paddingBottom: 4 }}>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>
                        История версий
                      </div>
                      <Table
                        dataSource={g.versions}
                        pagination={false}
                        size="small"
                        rowKey={(r) => r.currentVersion.id}
                        showHeader={false}
                        columns={[
                          {
                            key: 'v',
                            width: 60,
                            render: (_, r) => (
                              <Tag style={{ margin: 0 }}>{r.currentVersion.versionLabel}</Tag>
                            ),
                          },
                          {
                            key: 'letter',
                            width: 220,
                            render: (_, r) => (
                              <span style={{ fontSize: 12, color: '#6B7280' }}>
                                {r.currentVersion.letter.outgoingNumber ?? '—'}
                              </span>
                            ),
                          },
                          {
                            key: 'amt',
                            width: 130,
                            render: (_, r) => (
                              <MoneyCell value={r.currentVersion.totalAmount} compact />
                            ),
                          },
                          {
                            key: 'status',
                            render: (_, r) => <StatusTag status={r.currentVersion.status} small />,
                          },
                        ]}
                      />
                    </div>
                  ),
                }}
                onRow={(g) => ({
                  onClick: () => navigate(`/registry/${g.representative.calculation.id}`),
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
