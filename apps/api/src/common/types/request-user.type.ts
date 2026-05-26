import type { UserRole } from '@prisma/client';

export interface RequestUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
}
