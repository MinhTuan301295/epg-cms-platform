import type { UserRole } from '@prisma/client';

export class AuthUserDto {
  id!: string;
  email!: string;
  name!: string | null;
  role!: UserRole;
  permissions!: string[];
  isActive!: boolean;
}

export class AuthResponseDto {
  accessToken!: string;
  user!: AuthUserDto;
}
