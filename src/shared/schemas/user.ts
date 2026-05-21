import { z } from 'zod';
import { UserId, IsoDate } from './branded';
import { RoleCode } from './role';

export const UserSchema = z.object({
  id: UserId,
  fullName: z.string().min(1).max(200),
  email: z.string().email().nullable().default(null),
  role: RoleCode,
  isActive: z.boolean().default(true),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type User = z.infer<typeof UserSchema>;
