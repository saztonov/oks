import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Empty, Tag, Statistic, Row, Col, Table, Space, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowLeft, FileText } from 'lucide-react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatusTag } from '@/shared/ui/StatusTag';
import { ObjectBadge } from '@/shared/ui/ObjectBadge';
import { MoneyCell } from '@/shared/ui/MoneyCell';
import { useRdDocuments, useObjects, useSections, useCalculations } from '@/services/hooks';
import { formatDate } from '@/shared/lib/format';
import { formatMoney as fm } from '@/entities/calculation/compute';
import type { RDDocumentId } from '@/shared/schemas';
import type { CalcRowView } from '@/services/calculations';

export function RdDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: docs = [] } = useRdDocuments();
  const { data: objects = [] } = useObjects();
  const { data: sections = [] } = useSections();
  const { data: rows = [] } = useCalculations({});

  const doc = useMemo(() => docs.find((d) => d.id === (id as RDDocumentId)), [docs, id]);
  const object = useMemo(() => objects.find((o) => o.id === doc?.objectId), [objects, doc]);
  const section = useMemo(
    () => (doc?.sectionId ? sections.find((s) => s.id === doc.sectionId) : null),
    [sections, doc],
  );
  const linked: CalcRowView[] = useMemo(
    () => (doc ? rows.filter((r) => r.calculation.sourceRdIds.includes(doc.id)) : []),
    [rows, doc],
  );

  if (!doc) {
    return (
      <>
        <PageHeader title="Шифр не найден" />
        <Empty />
      </>
    );
  }

  const totalSum = linked.reduce((s, r) => s + Number(r.currentVersion.totalAmount), 0);
  const signed = linked.filter((r) => r.currentVersion.status === 'DS_SIGNED');
  const rejected = linked.filter((r) => r.currentVersion.status === 'REJECTED');
  const active = linked.filter(
    (r) => r.currentVersion.status !== 'DS_SIGNED' && r.currentVersion.status !== 'REJECTED',
  );

  const columns: ColumnsType<CalcRowView> = [
    {
      title: '№',
      key: 'num',
      width: 96,
      render: (_, r) => (
        <span style={{ fontWeight: 600 }}>
          №{r.calculation.serialNo} {r.currentVersion.versionLabel}
        </span>
      ),
    },
    {
      title: 'Тип',
      key: 'type',
      ellipsis: true,
      render: (_, r) => r.calcTypeName ?? '—',
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
      width: 140,
      align: 'right',
      render: (_, r) => <MoneyCell value={r.currentVersion.totalAmount} compact />,
      sorter: (a, b) =>
        Number(a.currentVersion.totalAmount) - Number(b.currentVersion.totalAmount),
    },
    {
      title: 'Статус',
      key: 'status',
      width: 200,
      render: (_, r) => <StatusTag status={r.currentVersion.status} small />,
    },
    {
      title: 'Ответственный',
      key: 'who',
      width: 180,
      render: (_, r) => r.assigneeName ?? '—',
    },
  ];

  return (
    <>
      <Button
        type="text"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate('/rd')}
        style={{ marginBottom: 12, paddingLeft: 0 }}
      >
        К списку шифров
      </Button>
      <PageHeader
        title={
          <Space>
            <FileText size={20} style={{ color: '#2F6FEB' }} />
            <span style={{ fontFamily: 'monospace' }}>{doc.code}</span>
            {object && <ObjectBadge name={object.name} color={object.color ?? '#6B7280'} />}
            {section && <Tag style={{ margin: 0 }}>{section.code}</Tag>}
          </Space>
        }
        subtitle={doc.issueDate ? `Выдан ${formatDate(doc.issueDate)}` : undefined}
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Всего расчётов" value={linked.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Общая сумма работ"
              value={totalSum}
              formatter={(v) => fm(v as number, { compact: true })}
              valueStyle={{ color: '#2F6FEB' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Подписано ДС"
              value={signed.length}
              valueStyle={{ color: '#16A34A' }}
              suffix={
                <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400 }}>
                  ({fm(signed.reduce((s, r) => s + Number(r.currentVersion.totalAmount), 0), { compact: true })})
                </span>
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Активных / Отказов"
              value={active.length}
              suffix={<span style={{ fontSize: 13, color: '#DC2626' }}> / {rejected.length}</span>}
            />
          </Card>
        </Col>
      </Row>

      <Card title={`Расчёты по шифру (${linked.length})`} styles={{ body: { padding: 0 } }}>
        {linked.length === 0 ? (
          <div style={{ padding: 48 }}>
            <Empty description="По этому шифру расчётов ещё нет" />
          </div>
        ) : (
          <Table<CalcRowView>
            dataSource={linked}
            columns={columns}
            rowKey={(r) => r.currentVersion.id}
            size="middle"
            pagination={{ defaultPageSize: 25, showSizeChanger: true }}
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
