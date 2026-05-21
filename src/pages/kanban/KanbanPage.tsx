import { useState, useMemo, useRef } from 'react';
import { Card, Select, Space, App, Switch, Tag, Empty } from 'antd';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatusTag } from '@/shared/ui/StatusTag';
import { ObjectBadge } from '@/shared/ui/ObjectBadge';
import { MoneyCell } from '@/shared/ui/MoneyCell';
import { useCalculations, useObjects, useUsers, useTransit } from '@/services/hooks';
import { useUiStore, useCurrentUser } from '@/app/stores/uiStore';
import { canTransit } from '@/entities/calculation/workflow';
import {
  STATUS_LABEL,
  STATUS_COLOR,
  type ObjectId,
  type StatusCode,
  type UserId,
} from '@/shared/schemas';
import type { CalcRowView } from '@/services/calculations';

const MAIN_COLUMNS: StatusCode[] = [
  'PLAN',
  'SENT_TO_CUSTOMER',
  'SENT_AGAIN',
  'APPROVED',
  'IN_DS',
  'DS_SIGNED',
];
const REJECTED_COLUMNS: StatusCode[] = ['REJECTED_RESUBMIT', 'REJECTED'];

export function KanbanPage() {
  const role = useUiStore((s) => s.role);
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { data: objects = [] } = useObjects();
  const { data: users = [] } = useUsers();
  const [objectId, setObjectId] = useState<ObjectId | null>(null);
  const [assigneeId, setAssigneeId] = useState<UserId | null>(null);
  const [showRejected, setShowRejected] = useState(false);

  const isEmployee = role === 'EMPLOYEE';
  const effectiveAssigneeId: UserId | null = isEmployee
    ? ((user?.id ?? null) as UserId | null)
    : assigneeId;

  const filters = useMemo(
    () => ({
      objectIds: objectId ? [objectId] : undefined,
      assigneeIds: effectiveAssigneeId ? [effectiveAssigneeId] : undefined,
    }),
    [objectId, effectiveAssigneeId],
  );
  const { data: rows = [] } = useCalculations(filters);
  const transit = useTransit();
  const { message } = App.useApp();

  const scrollRef = useRef<HTMLDivElement>(null);
  const panState = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  function onPanMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    // не активируем pan если клик по карточке (drag&drop ловит сам)
    if (target.closest('[data-rfd-draggable-id], [data-rbd-draggable-id], button, a, input')) return;
    if (e.button !== 0) return;
    if (!scrollRef.current) return;
    panState.current = {
      active: true,
      startX: e.pageX,
      startScroll: scrollRef.current.scrollLeft,
      moved: false,
    };
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
  }

  function onPanMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!panState.current.active || !scrollRef.current) return;
    const dx = e.pageX - panState.current.startX;
    if (Math.abs(dx) > 3) panState.current.moved = true;
    scrollRef.current.scrollLeft = panState.current.startScroll - dx;
  }

  function endPan() {
    if (!scrollRef.current) return;
    panState.current.active = false;
    scrollRef.current.style.cursor = 'grab';
    scrollRef.current.style.userSelect = '';
  }

  const grouped = useMemo(() => {
    const byStatus: Record<StatusCode, CalcRowView[]> = {
      PLAN: [],
      SENT_TO_CUSTOMER: [],
      SENT_AGAIN: [],
      APPROVED: [],
      IN_DS: [],
      DS_SIGNED: [],
      REJECTED: [],
      REJECTED_RESUBMIT: [],
    };
    for (const r of rows) byStatus[r.currentVersion.status].push(r);
    return byStatus;
  }, [rows]);

  const columns = showRejected ? [...MAIN_COLUMNS, ...REJECTED_COLUMNS] : MAIN_COLUMNS;

  const totalSums = useMemo(() => {
    const m: Record<StatusCode, number> = {} as Record<StatusCode, number>;
    for (const s of columns) {
      m[s] = grouped[s].reduce((sum, r) => sum + Number(r.currentVersion.totalAmount), 0);
    }
    return m;
  }, [grouped, columns]);

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const toStatus = destination.droppableId as StatusCode;
    const row = rows.find((r) => r.currentVersion.id === draggableId);
    if (!row) return;
    if (!canTransit(row.currentVersion.status, toStatus, role)) {
      message.warning(
        `Переход «${STATUS_LABEL[row.currentVersion.status]}» → «${STATUS_LABEL[toStatus]}» недоступен`,
      );
      return;
    }
    transit.mutate(
      {
        versionId: row.currentVersion.id,
        toStatus,
        performedBy: user?.id ?? null,
        role,
      },
      {
        onSuccess: () => message.success(`→ ${STATUS_LABEL[toStatus]}`),
        onError: (e: unknown) =>
          message.error(e instanceof Error ? e.message : 'Не удалось перевести'),
      },
    );
  }

  return (
    <>
      <PageHeader
        title="Канбан"
        subtitle={
          isEmployee
            ? `Только ваши расчёты${user?.fullName ? ` · ${user.fullName}` : ''}`
            : 'Перетащите карточку, чтобы изменить статус'
        }
        extra={
          <Space>
            <Select<ObjectId>
              placeholder="Все объекты"
              value={objectId ?? undefined}
              onChange={(v) => setObjectId(v ?? null)}
              options={objects.map((o) => ({ label: o.name, value: o.id }))}
              allowClear
              style={{ width: 200 }}
            />
            {!isEmployee && (
              <Select<UserId>
                placeholder="Все исполнители"
                value={assigneeId ?? undefined}
                onChange={(v) => setAssigneeId(v ?? null)}
                options={users.map((u) => ({ label: u.fullName, value: u.id }))}
                allowClear
                style={{ width: 220 }}
                showSearch
                optionFilterProp="label"
              />
            )}
            <Switch
              checked={showRejected}
              onChange={setShowRejected}
              checkedChildren="отказы"
              unCheckedChildren="отказы"
            />
          </Space>
        }
      />

      {rows.length === 0 ? (
        <Card>
          <Empty description="Нет расчётов под выбранные фильтры" />
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div
            ref={scrollRef}
            className="kanban-scroll"
            onMouseDown={onPanMouseDown}
            onMouseMove={onPanMouseMove}
            onMouseUp={endPan}
            onMouseLeave={endPan}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'stretch',
              minHeight: 'calc(100vh - 220px)',
              cursor: 'grab',
            }}
          >
            {columns.map((status) => {
              const items = grouped[status];
              const c = STATUS_COLOR[status];
              return (
                <div
                  key={status}
                  style={{
                    width: 290,
                    flexShrink: 0,
                    background: '#F9FAFB',
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 14px',
                      borderBottom: `2px solid ${c.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Space size={8}>
                      <span style={{ fontWeight: 600, color: c.text, fontSize: 13 }}>
                        {STATUS_LABEL[status]}
                      </span>
                      <Tag style={{ background: c.bg, color: c.text, borderColor: c.border, margin: 0 }}>
                        {items.length}
                      </Tag>
                    </Space>
                    <span
                      style={{
                        fontSize: 11,
                        color: '#9CA3AF',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {totalSums[status] >= 1_000_000
                        ? `${(totalSums[status] / 1_000_000).toFixed(1)} млн ₽`
                        : `${(totalSums[status] / 1000).toFixed(0)} тыс ₽`}
                    </span>
                  </div>
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          flex: 1,
                          padding: 8,
                          minHeight: 100,
                          background: snapshot.isDraggingOver ? '#EEF3FE' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        {items.map((row, idx) => (
                          <Draggable
                            key={row.currentVersion.id}
                            draggableId={row.currentVersion.id}
                            index={idx}
                          >
                            {(prov) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className="kanban-card"
                                style={{
                                  background: 'white',
                                  borderRadius: 8,
                                  padding: 10,
                                  marginBottom: 8,
                                  border: '1px solid #F0F1F3',
                                  borderLeft: `3px solid ${row.objectColor}`,
                                  cursor: 'pointer',
                                  ...prov.draggableProps.style,
                                }}
                                onClick={(e) => {
                                  if (panState.current.moved) {
                                    e.preventDefault();
                                    return;
                                  }
                                  navigate(`/registry/${row.calculation.id}`);
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: 6,
                                    gap: 6,
                                  }}
                                >
                                  <span style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>
                                    №{row.calculation.serialNo}{' '}
                                    <span style={{ color: '#9CA3AF', fontWeight: 400 }}>
                                      {row.currentVersion.versionLabel}
                                    </span>
                                  </span>
                                  <ObjectBadge
                                    name={row.objectName}
                                    color={row.objectColor}
                                    size="sm"
                                  />
                                </div>
                                <div
                                  style={{
                                    color: '#374151',
                                    fontSize: 12,
                                    marginBottom: 6,
                                    lineHeight: 1.4,
                                    overflow: 'hidden',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                  }}
                                >
                                  {row.calculation.workName}
                                </div>
                                <Space size={4} wrap style={{ marginBottom: 8 }}>
                                  {row.sectionCodes.slice(0, 4).map((s) => (
                                    <Tag key={s} style={{ margin: 0, fontSize: 10, padding: '0 4px' }}>
                                      {s}
                                    </Tag>
                                  ))}
                                </Space>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingTop: 6,
                                    borderTop: '1px solid #F4F6FA',
                                  }}
                                >
                                  <span style={{ fontSize: 11, color: '#6B7280' }}>
                                    {row.assigneeName?.split(' ').slice(0, 2).join(' ') ?? '—'}
                                  </span>
                                  <MoneyCell
                                    value={row.currentVersion.totalAmount}
                                    compact
                                    bold
                                  />
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {items.length === 0 && (
                          <div
                            style={{
                              textAlign: 'center',
                              padding: 16,
                              color: '#D1D5DB',
                              fontSize: 12,
                            }}
                          >
                            пусто
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </>
  );
}
