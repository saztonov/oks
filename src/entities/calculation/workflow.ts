import type { StatusCode } from '@/shared/schemas';
import type { RoleCode } from '@/shared/schemas';

export interface Transition {
  to: StatusCode;
  roles: ReadonlyArray<RoleCode>;
  label: string;
  requiresComment?: boolean;
  danger?: boolean;
}

export const WORKFLOW: Readonly<Record<StatusCode, ReadonlyArray<Transition>>> = {
  PLAN: [
    { to: 'SENT_TO_CUSTOMER', roles: ['EMPLOYEE', 'MANAGER'], label: 'Направить заказчику' },
  ],
  SENT_TO_CUSTOMER: [
    { to: 'APPROVED', roles: ['MANAGER'], label: 'Согласовано' },
    { to: 'REJECTED_RESUBMIT', roles: ['MANAGER'], label: 'На доработку (отказ с повторной подачей)' },
    { to: 'REJECTED', roles: ['MANAGER'], label: 'Отказ', danger: true, requiresComment: true },
  ],
  SENT_AGAIN: [
    { to: 'APPROVED', roles: ['MANAGER'], label: 'Согласовано' },
    { to: 'REJECTED_RESUBMIT', roles: ['MANAGER'], label: 'Снова на доработку' },
    { to: 'REJECTED', roles: ['MANAGER'], label: 'Отказ', danger: true, requiresComment: true },
  ],
  REJECTED_RESUBMIT: [
    { to: 'SENT_AGAIN', roles: ['EMPLOYEE', 'MANAGER'], label: 'Направить повторно' },
  ],
  APPROVED: [
    { to: 'IN_DS', roles: ['MANAGER'], label: 'Передать в ДС' },
  ],
  IN_DS: [
    { to: 'DS_SIGNED', roles: ['MANAGER'], label: 'Подписан ДС' },
  ],
  DS_SIGNED: [],
  REJECTED: [],
} as const;

export function availableTransitions(
  from: StatusCode,
  role: RoleCode,
): ReadonlyArray<Transition> {
  return WORKFLOW[from].filter((t) => t.roles.includes(role));
}

export function canTransit(from: StatusCode, to: StatusCode, role: RoleCode): boolean {
  return availableTransitions(from, role).some((t) => t.to === to);
}

export function isTerminal(status: StatusCode): boolean {
  return WORKFLOW[status].length === 0;
}

export const WORKFLOW_STAGES: ReadonlyArray<{ code: StatusCode; label: string }> = [
  { code: 'PLAN', label: 'План' },
  { code: 'SENT_TO_CUSTOMER', label: 'Направлено' },
  { code: 'APPROVED', label: 'Согласовано' },
  { code: 'IN_DS', label: 'В ДС' },
  { code: 'DS_SIGNED', label: 'Подписан' },
];

export function stageIndex(status: StatusCode): number {
  if (status === 'REJECTED_RESUBMIT' || status === 'SENT_AGAIN') {
    return WORKFLOW_STAGES.findIndex((s) => s.code === 'SENT_TO_CUSTOMER');
  }
  if (status === 'REJECTED') return -1;
  return WORKFLOW_STAGES.findIndex((s) => s.code === status);
}
