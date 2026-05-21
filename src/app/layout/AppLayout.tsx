import { useState, useMemo } from 'react';
import { Layout, Menu, Segmented, Button, Tooltip, App, Badge, Popover, List, Empty } from 'antd';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  KanbanSquare,
  GanttChartSquare,
  BarChart3,
  Settings2,
  RefreshCw,
  UserRound,
  Briefcase,
  Bell,
} from 'lucide-react';
import { useUiStore } from '../stores/uiStore';
import { useCurrentUser } from '../stores/uiStore';
import { useResetDb, useCalculations } from '@/services/hooks';
import { ACTIVE_STATUSES, STATUS_LABEL, type RoleCode } from '@/shared/schemas';
import { daysBetween } from '@/shared/lib/format';

const { Header, Sider, Content } = Layout;

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const role = useUiStore((s) => s.role);
  const setRole = useUiStore((s) => s.setRole);
  const currentUser = useCurrentUser();
  const reset = useResetDb();
  const { modal, message } = App.useApp();

  const items = [
    role === 'EMPLOYEE'
      ? { key: '/my', icon: <LayoutDashboard size={16} />, label: <Link to="/my">Мой кабинет</Link> }
      : { key: '/analytics', icon: <BarChart3 size={16} />, label: <Link to="/analytics">Аналитика</Link> },
    ...(role === 'MANAGER'
      ? [{ key: '/registry', icon: <ListChecks size={16} />, label: <Link to="/registry">Реестр расчётов</Link> }]
      : []),
    { key: '/kanban', icon: <KanbanSquare size={16} />, label: <Link to="/kanban">Канбан</Link> },
    { key: '/gantt', icon: <GanttChartSquare size={16} />, label: <Link to="/gantt">Гант</Link> },
    { key: '/dictionaries', icon: <Settings2 size={16} />, label: <Link to="/dictionaries">Справочники</Link> },
  ];

  const selectedKey =
    items.find((i) => location.pathname.startsWith(i.key as string))?.key ?? '/registry';

  function handleReset() {
    modal.confirm({
      title: 'Сбросить демо-данные?',
      content: 'Все локальные изменения будут потеряны, реестр вернётся к исходному состоянию из Excel.',
      okText: 'Сбросить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        reset.mutate(undefined, {
          onSuccess: () => message.success('Демо-данные восстановлены'),
        });
      },
    });
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={232}
        style={{
          borderRight: '1px solid #F0F1F3',
          background: '#FFFFFF',
        }}
        theme="light"
      >
        <div
          onClick={() => navigate(role === 'MANAGER' ? '/analytics' : '/my')}
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 20px',
            cursor: 'pointer',
            borderBottom: '1px solid #F0F1F3',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #2F6FEB, #5E8DEF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            ОКС
          </div>
          {!collapsed && (
            <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>Реестр доп. работ</div>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey as string]}
          items={items}
          style={{ borderRight: 0, padding: '8px 0' }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #F0F1F3',
            paddingInline: 24,
          }}
        >
          <Segmented<RoleCode>
            value={role}
            onChange={(v) => setRole(v as RoleCode)}
            options={[
              { label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><UserRound size={14} /> Сотрудник</span>, value: 'EMPLOYEE' },
              { label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Briefcase size={14} /> Руководитель</span>, value: 'MANAGER' },
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificationsCenter />
            <span style={{ color: '#6B7280', fontSize: 13 }}>
              {currentUser?.fullName ?? 'Не выбран'}
            </span>
            <Tooltip title="Сбросить демо-данные">
              <Button
                icon={<RefreshCw size={14} />}
                onClick={handleReset}
                type="text"
                shape="circle"
              />
            </Tooltip>
          </div>
        </Header>
        <Content style={{ padding: 24, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

function NotificationsCenter() {
  const navigate = useNavigate();
  const { data: rows = [] } = useCalculations({});
  const stuck = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            ACTIVE_STATUSES.includes(r.currentVersion.status) &&
            daysBetween(r.currentVersion.updatedAt) > 30,
        )
        .sort(
          (a, b) =>
            daysBetween(b.currentVersion.updatedAt) - daysBetween(a.currentVersion.updatedAt),
        )
        .slice(0, 8),
    [rows],
  );

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      title="Требуют внимания"
      content={
        stuck.length === 0 ? (
          <div style={{ width: 320 }}>
            <Empty description="Зависших расчётов нет" image={null} style={{ margin: '12px 0' }} />
          </div>
        ) : (
          <List
            style={{ width: 360 }}
            dataSource={stuck}
            renderItem={(r) => (
              <List.Item
                onClick={() => navigate(`/registry/${r.calculation.id}`)}
                style={{ cursor: 'pointer', padding: '8px 0' }}
              >
                <List.Item.Meta
                  title={
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      №{r.calculation.serialNo} {r.currentVersion.versionLabel} · {r.objectName}
                    </span>
                  }
                  description={
                    <span style={{ fontSize: 12, color: '#6B7280' }}>
                      {STATUS_LABEL[r.currentVersion.status]} ·{' '}
                      <span style={{ color: '#DC2626' }}>
                        {daysBetween(r.currentVersion.updatedAt)} дн без движения
                      </span>
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        )
      }
    >
      <Badge count={stuck.length} size="small" offset={[-2, 2]}>
        <Button type="text" shape="circle" icon={<Bell size={16} />} />
      </Badge>
    </Popover>
  );
}
