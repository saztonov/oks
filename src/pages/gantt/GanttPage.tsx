import { useMemo, useState } from 'react';
import { Card, Empty, Select, Space, Segmented } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Gantt, type Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import dayjs from 'dayjs';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useCalculations, useObjects } from '@/services/hooks';
import { useUiStore, useCurrentUser } from '@/app/stores/uiStore';
import { STATUS_COLOR } from '@/shared/schemas';
import type { ObjectId, UserId } from '@/shared/schemas';

type GroupBy = 'object' | 'assignee';

export function GanttPage() {
  const navigate = useNavigate();
  const role = useUiStore((s) => s.role);
  const user = useCurrentUser();
  const isEmployee = role === 'EMPLOYEE';
  const [objectId, setObjectId] = useState<ObjectId | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month);
  const [groupBy, setGroupBy] = useState<GroupBy>('object');
  const { data: objects = [] } = useObjects();
  const { data: rows = [] } = useCalculations({
    ...(objectId ? { objectIds: [objectId] } : {}),
    ...(isEmployee && user ? { assigneeIds: [user.id as UserId] } : {}),
  });

  const tasks: Task[] = useMemo(() => {
    const list: Task[] = [];
    const sorted = [...rows].sort((a, b) => {
      const groupCmp =
        groupBy === 'object'
          ? a.objectName.localeCompare(b.objectName)
          : (a.assigneeName ?? '').localeCompare(b.assigneeName ?? '');
      if (groupCmp !== 0) return groupCmp;
      return (a.currentVersion.letter.sentAt ?? '').localeCompare(b.currentVersion.letter.sentAt ?? '');
    });

    for (const r of sorted) {
      const v = r.currentVersion;
      const start = v.letter.sentAt ? dayjs(v.letter.sentAt) : dayjs(v.createdAt).subtract(7, 'day');
      const isClosed = v.status === 'DS_SIGNED' || v.status === 'REJECTED';
      const end = isClosed ? dayjs(v.updatedAt) : dayjs();
      const endSafe = end.diff(start, 'day') < 1 ? start.add(7, 'day') : end;
      const c = STATUS_COLOR[v.status];

      list.push({
        id: v.id,
        name: `№${r.calculation.serialNo} ${v.versionLabel}: ${r.calculation.workName.slice(0, 50)}`,
        start: start.toDate(),
        end: endSafe.toDate(),
        progress: isClosed ? 100 : 50,
        type: 'task',
        styles: {
          progressColor: c.text,
          progressSelectedColor: c.text,
          backgroundColor: c.bg,
          backgroundSelectedColor: c.bg,
        },
        project: groupBy === 'object' ? r.objectName : r.assigneeName ?? 'Без исполнителя',
      });
    }
    return list;
  }, [rows, groupBy]);

  return (
    <>
      <PageHeader
        title="Гант"
        subtitle={
          isEmployee
            ? `Только ваши расчёты${user?.fullName ? ` · ${user.fullName}` : ''}`
            : 'Бары: от даты отправки письма до закрытия (подписания ДС или отказа)'
        }
        extra={
          <Space>
            {!isEmployee && (
              <Segmented<GroupBy>
                value={groupBy}
                onChange={(v) => setGroupBy(v as GroupBy)}
                options={[
                  { label: 'По объекту', value: 'object' },
                  { label: 'По исполнителю', value: 'assignee' },
                ]}
              />
            )}
            <Segmented<ViewMode>
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
              options={[
                { label: 'Неделя', value: ViewMode.Week },
                { label: 'Месяц', value: ViewMode.Month },
                { label: 'Год', value: ViewMode.Year },
              ]}
            />
            <Select<ObjectId>
              placeholder="Все объекты"
              value={objectId ?? undefined}
              onChange={(v) => setObjectId(v ?? null)}
              options={objects.map((o) => ({ label: o.name, value: o.id }))}
              allowClear
              style={{ width: 200 }}
            />
          </Space>
        }
      />
      <Card styles={{ body: { padding: 0, overflow: 'auto' } }}>
        {tasks.length === 0 ? (
          <div style={{ padding: 48 }}>
            <Empty description="Нет данных для отображения" />
          </div>
        ) : (
          <Gantt
            tasks={tasks}
            viewMode={viewMode}
            locale="ru"
            listCellWidth="220px"
            ganttHeight={Math.min(800, Math.max(400, tasks.length * 36 + 60))}
            barCornerRadius={4}
            columnWidth={viewMode === ViewMode.Week ? 60 : viewMode === ViewMode.Month ? 110 : 260}
            onClick={(t) => {
              const row = rows.find((r) => r.currentVersion.id === t.id);
              if (row) navigate(`/registry/${row.calculation.id}`);
            }}
            TooltipContent={({ task }) => (
              <div
                style={{
                  background: 'white',
                  padding: 10,
                  borderRadius: 6,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  fontSize: 12,
                  maxWidth: 320,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{task.name}</div>
                <div style={{ color: '#6B7280' }}>
                  {dayjs(task.start).format('DD.MM.YYYY')} — {dayjs(task.end).format('DD.MM.YYYY')}
                </div>
              </div>
            )}
          />
        )}
      </Card>
    </>
  );
}
