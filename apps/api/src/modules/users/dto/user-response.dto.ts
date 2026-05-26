import type { UserRole } from '@prisma/client';

export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string | null;
  role!: UserRole;
  permissions!: string[];
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class UsersListResponseDto {
  data!: UserResponseDto[];
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
