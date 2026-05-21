import { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, App, Tag, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Plus, Edit3 } from 'lucide-react';
import { useSections, useUpsertSection } from '@/services/hooks';
import { v4 as uuid } from '@/shared/lib/uuid';
import type { RDSection, RDSectionId } from '@/shared/schemas';

interface FormVals {
  code: string;
  name: string;
}

export function SectionsTab() {
  const { data: sections = [] } = useSections();
  const upsert = useUpsertSection();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RDSection | null>(null);
  const [form] = Form.useForm<FormVals>();

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  }
  function openEdit(s: RDSection) {
    setEditing(s);
    form.setFieldsValue({ code: s.code, name: s.name });
    setOpen(true);
  }

  function handleSubmit(v: FormVals) {
    upsert.mutate(
      { id: editing?.id ?? (uuid() as RDSectionId), code: v.code, name: v.name },
      {
        onSuccess: () => {
          message.success(editing ? 'Раздел обновлён' : 'Раздел создан');
          setOpen(false);
        },
      },
    );
  }

  const columns: ColumnsType<RDSection> = [
    {
      title: 'Код',
      key: 'code',
      width: 120,
      render: (_, s) => <Tag style={{ fontWeight: 600 }}>{s.code}</Tag>,
    },
    { title: 'Наименование', dataIndex: 'name', key: 'name' },
    {
      title: '',
      key: 'actions',
      width: 80,
      align: 'right',
      render: (_, s) => <Button type="text" icon={<Edit3 size={14} />} onClick={() => openEdit(s)} />,
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12, justifyContent: 'flex-end', display: 'flex' }}>
        <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
          Добавить раздел
        </Button>
      </Space>
      <Card styles={{ body: { padding: 0 } }}>
        <Table<RDSection>
          dataSource={sections}
          columns={columns}
          rowKey="id"
          size="middle"
          pagination={false}
        />
      </Card>
      <Modal
        title={editing ? 'Редактировать раздел' : 'Новый раздел'}
        open={open}
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form<FormVals> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Код" name="code" rules={[{ required: true }]}>
            <Input placeholder="АР" />
          </Form.Item>
          <Form.Item label="Наименование" name="name" rules={[{ required: true }]}>
            <Input placeholder="Архитектурные решения" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
