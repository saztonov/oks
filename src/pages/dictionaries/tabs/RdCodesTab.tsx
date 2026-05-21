import { useMemo, useState } from 'react';
import { Card, Table, Tag, Input, Select, Space, Skeleton, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Search as SearchIcon, FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ObjectBadge } from '@/shared/ui/ObjectBadge';
import { MoneyCell } from '@/shared/ui/MoneyCell';
import {
  useRdDocuments,
  useObjects,
  useSections,
  useCalculations,
} from '@/services/hooks';
import { formatDate } from '@/shared/lib/format';
import type { ObjectId, RDSectionId, RDDocument } from '@/shared/schemas';

interface Row {
  doc: RDDocument;
  objectName: string;
  objectColor: string;
  sectionCode: string | null;
  calcCount: number;
  sumTotal: number;
  signedCount: number;
}

export function RdCodesTab() {
  const navigate = useNavigate();
  const { data: docs = [], isLoading } = useRdDocuments();
  const { data: objects = [] } = useObjects();
  const { data: sections = [] } = useSections();
  const { data: rows = [] } = useCalculations({});

  const [search, setSearch] = useState('');
  const [objectId, setObjectId] = useState<ObjectId | null>(null);
  const [sectionId, setSectionId] = useState<RDSectionId | null>(null);

  const result: Row[] = useMemo(() => {
    const objMap = new Map(objects.map((o) => [o.id, o]));
    const secMap = new Map(sections.map((s) => [s.id, s]));

    const calcByRd = new Map<string, typeof rows>();
    for (const r of rows) {
      for (const rid of r.calculation.sourceRdIds) {
        const arr = calcByRd.get(rid) ?? [];
        arr.push(r);
        calcByRd.set(rid, arr);
      }
    }

    return docs
      .filter((d) => (objectId ? d.objectId === objectId : true))
      .filter((d) => (sectionId ? d.sectionId === sectionId : true))
      .filter((d) => (search ? d.code.toLowerCase().includes(search.toLowerCase()) : true))
      .map((d) => {
        const obj = objMap.get(d.objectId);
        const sec = d.sectionId ? secMap.get(d.sectionId) : undefined;
        const rs = calcByRd.get(d.id) ?? [];
        return {
          doc: d,
          objectName: obj?.name ?? '?',
          objectColor: obj?.color ?? '#6B7280',
          sectionCode: sec?.code ?? null,
          calcCount: rs.length,
          sumTotal: rs.reduce((s, r) => s + Number(r.currentVersion.totalAmount), 0),
          signedCount: rs.filter((r) => r.currentVersion.status === 'DS_SIGNED').length,
        };
      })
      .sort((a, b) => b.calcCount - a.calcCount);
  }, [docs, objects, sections, rows, search, objectId, sectionId]);

  const columns: ColumnsType<Row> = [
    {
      title: 'Шифр РД',
      key: 'code',
      render: (_, r) => (
        <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#111827', fontWeight: 500 }}>
          {r.doc.code}
        </span>
      ),
    },
    {
      title: 'Объект',
      key: 'object',
      width: 160,
      render: (_, r) => <ObjectBadge name={r.objectName} color={r.objectColor} size="sm" />,
    },
    {
      title: 'Раздел',
      key: 'section',
      width: 100,
      render: (_, r) => (r.sectionCode ? <Tag style={{ margin: 0 }}>{r.sectionCode}</Tag> : '—'),
    },
    {
      title: 'Дата выдачи',
      key: 'issueDate',
      width: 120,
      render: (_, r) => formatDate(r.doc.issueDate),
    },
    {
      title: 'Расчётов',
      key: 'count',
      width: 110,
      align: 'right',
      render: (_, r) =>
        r.calcCount > 0 ? (
          <Tag color={r.signedCount > 0 ? 'green' : 'blue'} style={{ margin: 0, fontWeight: 600 }}>
            {r.calcCount}
          </Tag>
        ) : (
          <span style={{ color: '#D1D5DB' }}>—</span>
        ),
      sorter: (a, b) => a.calcCount - b.calcCount,
    },
    {
      title: 'Сумма работ, ₽',
      key: 'sum',
      width: 160,
      align: 'right',
      render: (_, r) =>
        r.sumTotal > 0 ? (
          <MoneyCell value={r.sumTotal} compact />
        ) : (
          <span style={{ color: '#D1D5DB' }}>—</span>
        ),
      sorter: (a, b) => a.sumTotal - b.sumTotal,
    },
    {
      title: '',
      key: 'go',
      width: 60,
      align: 'right',
      render: () => <ArrowRight size={14} style={{ color: '#9CA3AF' }} />,
    },
  ];

  return (
    <>
      <Card style={{ marginBottom: 12 }} styles={{ body: { padding: 12 } }}>
        <Space wrap>
          <Input
            placeholder="Поиск по шифру"
            prefix={<SearchIcon size={14} style={{ color: '#9CA3AF' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
          <Select<ObjectId>
            placeholder="Объект"
            value={objectId ?? undefined}
            onChange={(v) => setObjectId(v ?? null)}
            options={objects.map((o) => ({ label: o.name, value: o.id }))}
            allowClear
            style={{ width: 200 }}
          />
          <Select<RDSectionId>
            placeholder="Раздел"
            value={sectionId ?? undefined}
            onChange={(v) => setSectionId(v ?? null)}
            options={sections.map((s) => ({ label: s.code, value: s.id }))}
            allowClear
            style={{ width: 160 }}
          />
        </Space>
      </Card>
      <Card styles={{ body: { padding: 0 } }}>
        {isLoading ? (
          <div style={{ padding: 24 }}>
            <Skeleton active />
          </div>
        ) : result.length === 0 ? (
          <div style={{ padding: 48 }}>
            <Empty image={<FileText size={48} style={{ color: '#D1D5DB' }} />} description="Шифры не найдены" />
          </div>
        ) : (
          <Table<Row>
            dataSource={result}
            columns={columns}
            rowKey={(r) => r.doc.id}
            size="middle"
            pagination={{ defaultPageSize: 25, showSizeChanger: true }}
            onRow={(r) => ({
              onClick: () => navigate(`/rd/${r.doc.id}`),
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </Card>
    </>
  );
}
