import { useState } from 'react';
import { Button, Modal, Input, App } from 'antd';
import { availableTransitions } from '@/entities/calculation/workflow';
import type { CalculationVersion, StatusCode } from '@/shared/schemas';
import { useUiStore } from '@/app/stores/uiStore';
import { useCurrentUser } from '@/app/stores/uiStore';
import { useTransit } from '@/services/hooks';

interface Props {
  version: CalculationVersion;
}

export function TransitButtons({ version }: Props) {
  const role = useUiStore((s) => s.role);
  const user = useCurrentUser();
  const transit = useTransit();
  const { message } = App.useApp();
  const [pending, setPending] = useState<{ to: StatusCode; label: string; requiresComment: boolean } | null>(null);
  const [comment, setComment] = useState('');

  const transitions = availableTransitions(version.status, role);
  if (transitions.length === 0) return null;
  const primaryIdx = transitions.findIndex((t) => !t.danger);

  function execute(to: StatusCode, withComment = '') {
    transit.mutate(
      {
        versionId: version.id,
        toStatus: to,
        performedBy: user?.id ?? null,
        role,
        comment: withComment,
      },
      {
        onSuccess: () => message.success('Статус обновлён'),
        onError: (e: unknown) => message.error(e instanceof Error ? e.message : 'Ошибка перехода'),
      },
    );
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {transitions.map((t, i) => (
          <Button
            key={t.to}
            type={t.danger ? 'default' : 'primary'}
            danger={t.danger}
            size={i === primaryIdx ? 'large' : undefined}
            onClick={() => {
              if (t.requiresComment) {
                setPending({ to: t.to, label: t.label, requiresComment: true });
                setComment('');
              } else {
                execute(t.to);
              }
            }}
            loading={transit.isPending}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <Modal
        title={pending?.label}
        open={!!pending}
        onCancel={() => setPending(null)}
        onOk={() => {
          if (pending) {
            execute(pending.to, comment);
            setPending(null);
          }
        }}
        okText="Подтвердить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Input.TextArea
          rows={4}
          placeholder="Укажите причину…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
          autoFocus
        />
      </Modal>
    </>
  );
}
