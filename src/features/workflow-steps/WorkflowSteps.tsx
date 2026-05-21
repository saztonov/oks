import { Steps } from 'antd';
import type { StatusCode } from '@/shared/schemas';
import { stageIndex, WORKFLOW_STAGES } from '@/entities/calculation/workflow';

interface Props {
  status: StatusCode;
}

export function WorkflowSteps({ status }: Props) {
  const idx = stageIndex(status);
  const isRejected = status === 'REJECTED';
  const isRework = status === 'REJECTED_RESUBMIT' || status === 'SENT_AGAIN';

  return (
    <Steps
      current={idx < 0 ? 0 : idx}
      size="small"
      status={isRejected ? 'error' : isRework ? 'process' : 'process'}
      items={WORKFLOW_STAGES.map((s, i) => ({
        title: s.label,
        description:
          i === idx && isRework ? 'Доработка / повторно' : i === idx && isRejected ? 'Отказ' : undefined,
      }))}
    />
  );
}
