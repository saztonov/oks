import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Descriptions, Tabs, Tag, Skeleton, Empty, Button, Timeline, Space, App, Tooltip, Select } from 'antd';
import { ArrowLeft, Plus, Edit3, FileText, History, Paperclip, Link as LinkIcon, GitBranch } from 'lucide-react';
import { PageHeader } from '@/shared/ui/PageHeader';
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
          <StatusTag status={vv.status} small />
          <span style={{ color: '#9CA3AF', fontSize: 12 }}>
            {vv.letter.sentAt ? formatDate(vv.letter.sentAt) : 'без даты'}
          </span>
        </Space>
      ),
      value: vv.id,
    }));

  return (
    <>
      <Button
        type="text"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate(backTo)}
        style={{ marginBottom: 12, paddingLeft: 0 }}
      >
        {backLabel}
      </Button>

      <PageHeader
        title={
          <Space size={12} align="center" wrap>
            <span>Расчёт №{calc.serialNo}</span>
            <ObjectBadge name={row.objectName} color={row.objectColor} />
            <StatusTag status={v.status} />
          </Space>
        }
        subtitle={
          <span>
            Обновлён {formatDateTime(v.updatedAt)}
            {calc.assigneeId && (
              <>
                {' · '}Ответственный:{' '}
                <strong>{userMap.get(calc.assigneeId)?.fullName ?? '—'}</strong>
              </>
            )}
          </span>
        }
        extra={
          <Space>
            <Select<CalcVersionId>
              prefix={<GitBranch size={14} style={{ color: '#9CA3AF' }} />}
              value={v.id}
              onChange={handleSwitchVersion}
              options={versionOptions}
              style={{ minWidth: 240 }}
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
        }
      />

      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '20px 24px' } }}>
        <WorkflowSteps status={v.status} />
        <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <TransitButtons version={v} />
        </div>
      </Card>

      <Tabs
        defaultActiveKey="main"
        items={[
          {
            key: 'main',
            label: (
              <span>
                <FileText size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Основное
              </span>
            ),
            children: (
              <>
                <Card title="Атрибуты расчёта" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>
                    Эти поля одинаковые для всех версий расчёта
                  </div>
                  <Descriptions
                    column={2}
                    bordered={false}
                    size="middle"
                    labelStyle={{ color: '#6B7280', fontSize: 13, width: 200 }}
                    contentStyle={{ color: '#111827', fontSize: 13 }}
                  >
                    <Descriptions.Item label="Объект">
                      <ObjectBadge name={row.objectName} color={row.objectColor} />
                    </Descriptions.Item>
                    <Descriptions.Item label="№ п/п">№{calc.serialNo}</Descriptions.Item>
                    <Descriptions.Item label="Тип расчёта">
                      {row.calcTypeName ?? '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ответственный">
                      {calc.assigneeId ? userMap.get(calc.assigneeId)?.fullName ?? '—' : '—'}
                    </Descriptions.Item>
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
                    <Descriptions.Item label="Шифры РД">
                      {sourceRdItems.length === 0 ? (
                        '—'
                      ) : (
                        <Space size={4} wrap>
                          {sourceRdItems.map((d) => (
                            <Link to={`/rd/${d.id}`} key={d.id}>
                              <Tag color="blue" style={{ margin: 0, cursor: 'pointer' }}>
                                {d.code}
                              </Tag>
                            </Link>
                          ))}
                        </Space>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Наименование работ" span={2}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{calc.workName}</div>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card
                  title={
                    <Space>
                      <span>Данные версии</span>
                      <Tag color="blue" style={{ margin: 0 }}>
                        {v.versionLabel}
                      </Tag>
                      <StatusTag status={v.status} small />
                    </Space>
                  }
                >
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>
                    Суммы, даты, файлы и письмо относятся к выбранной версии
                  </div>
                  <Descriptions
                    column={2}
                    bordered={false}
                    size="middle"
                    labelStyle={{ color: '#6B7280', fontSize: 13, width: 200 }}
                    contentStyle={{ color: '#111827', fontSize: 13 }}
                  >
                    <Descriptions.Item label="Исх. письмо">
                      {v.letter.outgoingNumber ?? '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Дата отправки">
                      {formatDate(v.letter.sentAt)}
                    </Descriptions.Item>
                    {v.dsNumber && (
                      <Descriptions.Item label="Номер ДС" span={2}>
                        <Tag color="green">{v.dsNumber}</Tag>
                      </Descriptions.Item>
                    )}
                    {v.note && (
                      <Descriptions.Item label="Примечание к версии" span={2}>
                        <div style={{ whiteSpace: 'pre-wrap', color: '#374151' }}>{v.note}</div>
                      </Descriptions.Item>
                    )}
                  </Descriptions>

                  <div
                    style={{
                      marginTop: 24,
                      paddingTop: 24,
                      borderTop: '1px solid #F0F1F3',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 24,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
                        Прямые затраты (ПЗ)
                      </div>
                      <MoneyCell value={v.directCost} bold align="left" />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
                        Коэф. накладных
                      </div>
                      <span style={{ fontWeight: 600, color: '#111827', fontSize: 16 }}>
                        ×{Number(v.overheadCoeff).toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
                        Итоговая сумма
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          color: '#2F6FEB',
                          fontSize: 22,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {Number(v.totalAmount).toLocaleString('ru-RU', {
                          style: 'currency',
                          currency: 'RUB',
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </div>
                </Card>
              </>
            ),
          },
          {
            key: 'history',
            label: (
              <span>
                <History size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                История версии ({transitions.length})
              </span>
            ),
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
            label: (
              <span>
                <Paperclip size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Файлы версии ({v.attachments.length})
              </span>
            ),
            children: (
              <Card>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>
                  Файлы относятся к выбранной версии {v.versionLabel}
                </div>
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
            label: (
              <span>
                <LinkIcon size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Все версии ({row.versions.length})
              </span>
            ),
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
