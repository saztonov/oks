import { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Switch, Tag, App, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Plus, Edit3 } from 'lucide-react';
import { useUsers, useUpsertUser } from '@/services/hooks';
import { v4 as uuid } from '@/shared/lib/uuid';
import type { RoleCode, User, UserId } from '@/shared/schemas';
import { ROLE_LABEL } from '@/shared/schemas';

interface FormVals {
  fullName: string;
  email: string;
  role: RoleCode;
  isActive: boolean;
}

export function EmployeesTab() {
  const { data: users = [] } = useUsers();
  const upsert = useUpsertUser();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form] = Form.useForm<FormVals>();

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ role: 'EMPLOYEE', isActive: true });
    setOpen(true);
  }
  function openEdit(u: User) {
    setEditing(u);
    form.setFieldsValue({
      fullName: u.fullName,
      email: u.email ?? '',
      role: u.role,
      isActive: u.isActive,
    });
    setOpen(true);
  }

  function handleSubmit(v: FormVals) {
    upsert.mutate(
      {
        id: editing?.id ?? (uuid() as UserId),
        fullName: v.fullName,
        email: v.email || null,
        role: v.role,
        isActive: v.isActive,
      },
      {
        onSuccess: () => {
          message.success(editing ? 'Сотрудник обновлён' : 'Сотрудник создан');
          setOpen(false);
        },
      },
    );
  }

  const columns: ColumnsType<User> = [
    { title: 'ФИО', dataIndex: 'fullName', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email', render: (v) => v || '—' },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      width: 160,
      render: (r: RoleCode) => (
        <Tag color={r === 'MANAGER' ? 'blue' : 'default'}>{ROLE_LABEL[r]}</Tag>
      ),
    },
    {
      title: 'Активен',
      key: 'active',
      width: 100,
      render: (_, u) => (u.isActive ? <Tag color="green">Да</Tag> : <Tag>Архив</Tag>),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      align: 'right',
      render: (_, u) => <Button type="text" icon={<Edit3 size={14} />} onClick={() => openEdit(u)} />,
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12, justifyContent: 'flex-end', display: 'flex' }}>
        <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
          Добавить сотрудника
        </Button>
      </Space>
      <Card styles={{ body: { padding: 0 } }}>
        <Table<User>
          dataSource={users}
          columns={columns}
          rowKey="id"
          size="middle"
          pagination={false}
        />
      </Card>
      <Modal
        title={editing ? 'Редактировать сотрудника' : 'Новый сотрудник'}
        open={open}
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form<FormVals> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="ФИО" name="fullName" rules={[{ required: true }]}>
            <Input placeholder="Иванов Иван Иванович" />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input placeholder="ivanov@example.com" />
          </Form.Item>
          <Form.Item label="Роль" name="role">
            <Select
              options={[
                { label: 'Сотрудник', value: 'EMPLOYEE' },
                { label: 'Руководитель', value: 'MANAGER' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Активен" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
