import { z } from 'zod';

export const StatusCode = z.enum([
  'PLAN',
  'SENT_TO_CUSTOMER',
  'SENT_AGAIN',
  'APPROVED',
  'IN_DS',
  'DS_SIGNED',
  'REJECTED',
  'REJECTED_RESUBMIT',
]);
export type StatusCode = z.infer<typeof StatusCode>;

export const STATUS_LABEL: Record<StatusCode, string> = {
  PLAN: 'ПЛАН',
  SENT_TO_CUSTOMER: 'Направлено заказчику',
  SENT_AGAIN: 'Направлено заказчику повторно',
  APPROVED: 'Согласовано',
  IN_DS: 'Ушло в ДС',
  DS_SIGNED: 'Подписан ДС',
  REJECTED: 'Отказ',
  REJECTED_RESUBMIT: 'Отказ, необходима повторная подача',
};

export const STATUS_COLOR: Record<
  StatusCode,
  { bg: string; text: string; border: string }
> = {
  PLAN: { bg: '#F4F6FA', text: '#4B5563', border: '#E5E7EB' },
  SENT_TO_CUSTOMER: { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD' },
  SENT_AGAIN: { bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' },
  APPROVED: { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
  IN_DS: { bg: '#E0E7FF', text: '#3730A3', border: '#C7D2FE' },
  DS_SIGNED: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  REJECTED: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  REJECTED_RESUBMIT: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
};

export const STATUS_ORDER: StatusCode[] = [
  'PLAN',
  'SENT_TO_CUSTOMER',
  'SENT_AGAIN',
  'APPROVED',
  'IN_DS',
  'DS_SIGNED',
  'REJECTED_RESUBMIT',
  'REJECTED',
];

export const TERMINAL_STATUSES: ReadonlySet<StatusCode> = new Set(['DS_SIGNED', 'REJECTED']);

export const ACTIVE_STATUSES: StatusCode[] = [
  'SENT_TO_CUSTOMER',
  'SENT_AGAIN',
  'APPROVED',
  'IN_DS',
  'REJECTED_RESUBMIT',
];
