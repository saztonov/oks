import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Descriptions, Tabs, Tag, Skeleton, Empty, Button, Timeline, Space, App, Tooltip, Select } from 'antd';
import { ArrowLeft, Plus, Edit3, GitBranch } from 'lucide-react';
import { StatusTag } from '@/shared/ui/StatusTag';
import { ObjectBadge } from '@/shared/ui/ObjectBadge';
import { MoneyCell } from '@/shared/ui/MoneyCell';
import { WorkflowSteps } from '@/features/workflow-steps/WorkflowSteps';
import { TransitButtons } from '@/features/workflow-steps/TransitButtons';
import { AttachmentsList } from '@/features/calculation-attachments/AttachmentsList';
import {
  useCalculation,
  useTransitions,
  useRdDocuments,
  useUsers,
  useCreateNewVersion,
  useSetCurrentVersion,
} from '@/services/hooks';
import { useCurrentUser, useUiStore } from '@/app/stores/uiStore';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import { STATUS_LABEL, type CalcVersionId, type CalculationId } from '@/shared/schemas';
import { TERMINAL_STATUSES } from '@/shared/schemas';

const SHIFRY_VISIBLE_LIMIT = 6;

function formatRub(value: number | string): string {
  return Number(value).toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  });
}

export function CalculationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useUiStore((s) => s.role);
  const backTo = role === 'EMPLOYEE' ? '/my' : '/registry';
  const backLabel = role === 'EMPLOYEE' ? 'В мой кабинет' : 'К реестру';
  const currentUser = useCurrentUser();
  const { data: row, isLoading } = useCalculation(id as CalculationId);
  const { data: rdDocs = [] } = useRdDocuments();
  const { data: users = [] } = useUsers();
  const { data: transitions = [] } = useTransitions(row?.currentVersion.id);
  const newVer = useCreateNewVersion();
  const setCurrentVersion = useSetCurrentVersion();
  const { message } = App.useApp();
  const [shifryExpanded, setShifryExpanded] = useState(false);

  const rdMap = useMemo(() => new Map(rdDocs.map((d) => [d.id, d])), [rdDocs]);
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  if (isLoading) {
    return (
      <Card>
        <Skeleton active />
      </Card>
    );
  }
  if (!row) {
    return <Empty description="Расчёт не найден" />;
  }

  const calc = row.calculation;
  const v = row.currentVersion;
  const isTerminal = TERMINAL_STATUSES.has(v.status);
  const isRejected = v.status === 'REJECTED';

  const sourceRdItems = calc.sourceRdIds
    .map((rid) => rdMap.get(rid))
    .filter((x): x is NonNullable<typeof x> => !!x);

  const assigneeName = calc.assigneeId ? userMap.get(calc.assigneeId)?.fullName ?? '—' : '—';

  function handleCreateVersion() {
    newVer.mutate(
      { calcId: calc.id, createdBy: currentUser?.id ?? null },
      { onSuccess: () => message.success('Создана новая версия') },
    );
  }

  function handleSwitchVersion(verId: CalcVersionId) {
    setCurrentVersion.mutate(
      { calcId: calc.id, versionId: verId },
      { onSuccess: () => message.success('Версия переключена') },
    );
  }

  const versionOptions = row.versions
    .slice()
    .sort((a, b) => b.versionNo - a.versionNo)
    .map((vv) => ({
      label: (
        <Space size={6}>
          <Tag style={{ margin: 0 }}>{vv.versionLabel}</Tag>
          <span style={{ color: '#9CA3AF', fontSize: 12 }}>
            {vv.letter.sentAt ? formatDate(vv.letter.sentAt) : 'без даты'}
          </span>
        </Space>
      ),
      value: vv.id,
    }));

  const dotSep = (
    <span style={{ color: '#D1D5DB', margin: '0 8px' }} aria-hidden>
      ·
    </span>
  );

  const visibleShifry = shifryExpanded ? sourceRdItems : sourceRdItems.slice(0, SHIFRY_VISIBLE_LIMIT);
  const hiddenShifryCount = sourceRdItems.length - visibleShifry.length;

  return (
    <>
      {/* Зона 1 — хлебная крошка */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 4,
          fontSize: 13,
          color: '#6B7280',
          marginBottom: 16,
        }}
      >
        <Button
          type="text"
          size="small"
          icon={<ArrowLeft size={14} />}
          onClick={() => navigate(backTo)}
          style={{ paddingLeft: 0, color: '#6B7280', height: 24 }}
        >
          {backLabel}
        </Button>
        {dotSep}
        <span style={{ color: '#111827', fontWeight: 500 }}>Расчёт №{calc.serialNo}</span>
        {dotSep}
        <ObjectBadge name={row.objectName} color={row.objectColor} size="sm" />
        {dotSep}
        <span>обновлён {formatDateTime(v.updatedAt)}</span>
        {calc.assigneeId && (
          <>
            {dotSep}
            <span>
              отв. <span style={{ color: '#374151', fontWeight: 500 }}>{assigneeName}</span>
            </span>
          </>
        )}
      </div>

      {/* Зона 2 — Hero */}
      <Card style={{ marginBottom: 12 }} styles={{ body: { padding: '20px 24px' } }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0, flex: '1 1 320px' }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: '#2F6FEB',
                lineHeight: 1.15,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em',
              }}
            >
              {formatRub(v.totalAmount)}
            </div>
            <div
              style={{
                fontSize: 13,
                color: '#6B7280',
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>ПЗ {formatRub(v.directCost)}</span>
              <span style={{ color: '#D1D5DB' }}>×</span>
              <span>{Number(v.overheadCoeff).toFixed(4).replace('.', ',')}</span>
              <span style={{ color: '#D1D5DB' }}>=</span>
              <span style={{ color: '#9CA3AF' }}>итоговая сумма</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 12,
              flex: '0 0 auto',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                transform: 'scale(1.25)',
                transformOrigin: 'right top',
              }}
            >
              <StatusTag status={v.status} />
            </span>
            <Space size={8} wrap style={{ justifyContent: 'flex-end' }}>
              <Select<CalcVersionId>
                prefix={<GitBranch size={14} style={{ color: '#9CA3AF' }} />}
                value={v.id}
                onChange={handleSwitchVersion}
                options={versionOptions}
                style={{ minWidth: 200 }}
                popupMatchSelectWidth={false}
              />
              <Button
                icon={<Edit3 size={14} />}
                onClick={() => navigate(`/registry/${calc.id}/edit`)}
              >
                Редактировать
              </Button>
              <Tooltip title="Создать новую версию на базе текущей">
                <Button icon={<Plus size={14} />} onClick={handleCreateVersion}>
                  Новая версия
                </Button>
              </Tooltip>
            </Space>
          </div>
        </div>
      </Card>

      {/* Зона 3 — Воркфлоу-полоса */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '14px 20px' } }}>
        <WorkflowSteps status={v.status} />
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <TransitButtons version={v} />
        </div>
      </Card>

      {/* Зона 4 — Tabs */}
      <Tabs
        defaultActiveKey="main"
        items={[
          {
            key: 'main',
            label: 'Сведения',
            children: (
              <Card styles={{ body: { padding: '20px 24px' } }}>
                <Descriptions
                  column={2}
                  bordered={false}
                  size="middle"
                  labelStyle={{ color: '#6B7280', fontSize: 13, width: 200 }}
                  contentStyle={{ color: '#111827', fontSize: 13 }}
                >
                  <Descriptions.Item label="Наименование работ" span={2}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{calc.workName}</div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Тип расчёта">
                    {row.calcTypeName ?? '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ответственный">{assigneeName}</Descriptions.Item>
                  <Descriptions.Item label="Разделы РД">
                    <Space size={4} wrap>
                      {row.sectionCodes.map((s) => (
                        <Tag key={s} style={{ margin: 0 }}>
                          {s}
                        </Tag>
                      ))}
                      {row.sectionCodes.length === 0 && '—'}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Исх. письмо">
                    {v.letter.outgoingNumber ?? '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Шифры РД" span={2}>
                    {sourceRdItems.length === 0 ? (
                      '—'
                    ) : (
                      <Space size={4} wrap>
                        {visibleShifry.map((d) => (
                          <Link to={`/rd/${d.id}`} key={d.id}>
                            <Tag color="blue" style={{ margin: 0, cursor: 'pointer' }}>
                              {d.code}
                            </Tag>
                          </Link>
                        ))}
                        {hiddenShifryCount > 0 && (
                          <Tag
                            onClick={() => setShifryExpanded(true)}
                            style={{ margin: 0, cursor: 'pointer' }}
                          >
                            +{hiddenShifryCount}
                          </Tag>
                        )}
                        {shifryExpanded && sourceRdItems.length > SHIFRY_VISIBLE_LIMIT && (
                          <Tag
                            onClick={() => setShifryExpanded(false)}
                            style={{ margin: 0, cursor: 'pointer' }}
                          >
                            свернуть
                          </Tag>
                        )}
                      </Space>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Дата отправки">
                    {formatDate(v.letter.sentAt)}
                  </Descriptions.Item>
                  {v.dsNumber && (
                    <Descriptions.Item label="Номер ДС">
                      <Tag color="green" style={{ margin: 0 }}>
                        {v.dsNumber}
                      </Tag>
                    </Descriptions.Item>
                  )}
                  {v.note && (
                    <Descriptions.Item label="Примечание к версии" span={2}>
                      <div style={{ whiteSpace: 'pre-wrap', color: '#374151' }}>{v.note}</div>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'history',
            label: `История (${transitions.length})`,
            children: (
              <Card>
                {transitions.length === 0 ? (
                  <Empty description="История пуста" />
                ) : (
                  <Timeline
                    items={transitions
                      .slice()
                      .reverse()
                      .map((t) => ({
                        color:
                          t.toStatus === 'DS_SIGNED'
                            ? 'green'
                            : t.toStatus === 'REJECTED'
                              ? 'red'
                              : 'blue',
                        children: (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {t.fromStatus ? (
                                <>
                                  <span style={{ color: '#9CA3AF' }}>
                                    {STATUS_LABEL[t.fromStatus]}
                                  </span>
                                  <span style={{ color: '#9CA3AF' }}>→</span>
                                </>
                              ) : null}
                              <StatusTag status={t.toStatus} small />
                            </div>
                            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                              {formatDateTime(t.performedAt)}
                              {t.performedBy && (
                                <>
                                  {' · '}
                                  {userMap.get(t.performedBy)?.fullName ?? '—'}
                                </>
                              )}
                            </div>
                            {t.comment && (
                              <div
                                style={{
                                  marginTop: 6,
                                  padding: 8,
                                  background: '#F9FAFB',
                                  borderRadius: 6,
                                  fontSize: 13,
                                  color: '#374151',
                                }}
                              >
                                {t.comment}
                              </div>
                            )}
                          </div>
                        ),
                      }))}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'files',
            label: `Файлы (${v.attachments.length})`,
            children: (
              <Card>
                <AttachmentsList
                  versionId={v.id}
                  attachments={v.attachments}
                  editable={!isTerminal && !isRejected}
                />
              </Card>
            ),
          },
          {
            key: 'versions',
            label: `Версии (${row.versions.length})`,
            children: (
              <Card>
                <Timeline
                  items={row.versions
                    .slice()
                    .sort((a, b) => b.versionNo - a.versionNo)
                    .map((vv) => ({
                      color: vv.id === v.id ? 'blue' : 'gray',
                      children: (
                        <div
                          onClick={() => handleSwitchVersion(vv.id)}
                          style={{
                            cursor: 'pointer',
                            padding: '8px 0',
                          }}
                        >
                          <Space>
                            <Tag color={vv.id === v.id ? 'blue' : 'default'}>
                              {vv.versionLabel}
                            </Tag>
                            <StatusTag status={vv.status} small />
                            <MoneyCell value={vv.totalAmount} compact />
                            {vv.id === v.id && (
                              <Tag color="processing" style={{ margin: 0 }}>
                                текущая
                              </Tag>
                            )}
                          </Space>
                          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                            {vv.letter.outgoingNumber ?? '—'}{' '}
                            {vv.letter.sentAt ? `от ${formatDate(vv.letter.sentAt)}` : ''}
                          </div>
                        </div>
                      ),
                    }))}
                />
              </Card>
            ),
          },
        ]}
      />
    </>
  );
}
