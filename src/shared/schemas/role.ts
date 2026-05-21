import { z } from 'zod';

export const RoleCode = z.enum(['EMPLOYEE', 'MANAGER']);
export type RoleCode = z.infer<typeof RoleCode>;

export const ROLE_LABEL: Record<RoleCode, string> = {
  EMPLOYEE: 'Сотрудник',
  MANAGER: 'Руководитель',
};
