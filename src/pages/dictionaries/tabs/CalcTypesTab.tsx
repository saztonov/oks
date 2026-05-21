import { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, App, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Plus, Edit3 } from 'lucide-react';
import { useCalcTypes, useUpsertCalcType } from '@/services/hooks';
import { v4 as uuid } from '@/shared/lib/uuid';
import type { CalculationType, CalcTypeId } from '@/shared/schemas';

interface FormVals {
  code: string;
  name: string;
}

export function CalcTypesTab() {
  const { data: types = [] } = useCalcTypes();
  const upsert = useUpsertCalcType();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CalculationType | null>(null);
  const [form] = Form.useForm<FormVals>();

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  }
  function openEdit(t: CalculationType) {
    setEditing(t);
    form.setFieldsValue({ code: t.code, name: t.name });
    setOpen(true);
  }

  function handleSubmit(v: FormVals) {
    upsert.mutate(
      { id: editing?.id ?? (uuid() as CalcTypeId), code: v.code, name: v.name },
      {
        onSuccess: () => {
          message.success(editing ? 'Тип обновлён' : 'Тип создан');
          setOpen(false);
        },
      },
    );
  }

  const columns: ColumnsType<CalculationType> = [
    { title: 'Наименование', dataIndex: 'name', key: 'name' },
    {
      title: '',
      key: 'actions',
      width: 80,
      align: 'right',
      render: (_, t) => <Button type="text" icon={<Edit3 size={14} />} onClick={() => openEdit(t)} />,
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12, justifyContent: 'flex-end', display: 'flex' }}>
        <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
          Добавить тип
        </Button>
      </Space>
      <Card styles={{ body: { padding: 0 } }}>
        <Table<CalculationType>
          dataSource={types}
          columns={columns}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
        />
      </Card>
      <Modal
        title={editing ? 'Редактировать тип' : 'Новый тип'}
        open={open}
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form<FormVals> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Код" name="code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Наименование" name="name" rules={[{ required: true }]}>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
