import { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Switch, ColorPicker, App, Tag, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Plus, Edit3 } from 'lucide-react';
import { ObjectBadge } from '@/shared/ui/ObjectBadge';
import { useObjects, useUpsertObject } from '@/services/hooks';
import { v4 as uuid } from '@/shared/lib/uuid';
import type { ConstructionObject, ObjectId } from '@/shared/schemas';

interface FormVals {
  code: string;
  name: string;
  color: string;
  isActive: boolean;
}

export function ObjectsTab() {
  const { data: objects = [] } = useObjects();
  const upsert = useUpsertObject();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ConstructionObject | null>(null);
  const [form] = Form.useForm<FormVals>();

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ color: '#2F6FEB', isActive: true });
    setOpen(true);
  }

  function openEdit(obj: ConstructionObject) {
    setEditing(obj);
    form.setFieldsValue({
      code: obj.code,
      name: obj.name,
      color: obj.color ?? '#2F6FEB',
      isActive: obj.isActive,
    });
    setOpen(true);
  }

  function handleSubmit(v: FormVals) {
    const colorString =
      typeof v.color === 'string'
        ? v.color
        : (v.color as unknown as { toHexString?: () => string })?.toHexString?.() ?? '#2F6FEB';
    upsert.mutate(
      {
        id: editing?.id ?? (uuid() as ObjectId),
        code: v.code,
        name: v.name,
        color: colorString,
        isActive: v.isActive,
      },
      {
        onSuccess: () => {
          message.success(editing ? 'Объект обновлён' : 'Объект создан');
          setOpen(false);
        },
      },
    );
  }

  const columns: ColumnsType<ConstructionObject> = [
    {
      title: 'Код',
      key: 'code',
      render: (_, o) => <ObjectBadge name={o.code} color={o.color ?? '#6B7280'} />,
    },
    { title: 'Полное наименование', dataIndex: 'name', key: 'name' },
    {
      title: 'Активен',
      key: 'active',
      width: 100,
      render: (_, o) => (o.isActive ? <Tag color="green">Активен</Tag> : <Tag>Архив</Tag>),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      align: 'right',
      render: (_, o) => (
        <Button type="text" icon={<Edit3 size={14} />} onClick={() => openEdit(o)} />
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12, justifyContent: 'flex-end', display: 'flex' }}>
        <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
          Добавить объект
        </Button>
      </Space>
      <Card styles={{ body: { padding: 0 } }}>
        <Table<ConstructionObject>
          dataSource={objects}
          columns={columns}
          rowKey="id"
          size="middle"
          pagination={false}
        />
      </Card>
      <Modal
        title={editing ? 'Редактировать объект' : 'Новый объект'}
        open={open}
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form<FormVals> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Код" name="code" rules={[{ required: true }]}>
            <Input placeholder="KING" />
          </Form.Item>
          <Form.Item label="Полное наименование" name="name" rules={[{ required: true }]}>
            <Input placeholder="ЖК KING" />
          </Form.Item>
          <Form.Item label="Цвет" name="color">
            <ColorPicker format="hex" showText />
          </Form.Item>
          <Form.Item label="Активен" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
