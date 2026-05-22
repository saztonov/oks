import { Steps } from 'antd';
import type { StatusCode } from '@/shared/schemas';
import { stageIndex, WORKFLOW_STAGES } from '@/entities/calculation/workflow';

interface Props {
  status: StatusCode;
}

export function WorkflowSteps({ status }: Props) {
  const idx = stageIndex(status);
  const isRejected = status === 'REJECTED';

  return (
    <Steps
      current={idx < 0 ? 0 : idx}
      size="small"
      status={isRejected ? 'error' : 'process'}
      items={WORKFLOW_STAGES.map((s) => ({ title: s.label }))}
    />
  );
}
