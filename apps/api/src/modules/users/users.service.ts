import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { ALL_PERMISSIONS } from '../../common/permissions/permissions.constants';
import { ROLE_DEFAULT_PERMISSIONS, resolvePermissionsForRole } from '../../common/permissions/role-permissions';
import type { CreateUserDto } from './dto/create-user.dto';
import type { QueryUsersDto } from './dto/query-users.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { UserResponseDto, UsersListResponseDto } from './dto/user-response.dto';

const PASSWORD_SALT_ROUNDS = 12;
const SORT_LOCALE = 'en';

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  // ── Internal finders (used by Auth) ────────────────────────────────────────

  findByEmail(email: string): Promise<User | null> {
    return this.prismaService.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prismaService.user.findUnique({ where: { id } });
  }

  // ── Admin CRUD ──────────────────────────────────────────────────────────────

  async findAll(query: QueryUsersDto): Promise<UsersListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(query.role !== undefined ? { role: query.role } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };

    const [data, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      data: data.map(this.toResponse),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prismaService.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.toResponse(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const password = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const permissions = this.resolvePermissions(dto.role, dto.permissions);

    const user = await this.prismaService.user.create({
      data: {
        email: dto.email,
        password,
        name: dto.name,
        role: dto.role,
        permissions,
        isActive: dto.isActive ?? true,
      },
    });

    return this.toResponse(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.prismaService.user.findUnique({ where: { id } });

    if (!existingUser) {
      throw new NotFoundException(`User ${id} not found`);
    }

    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) data['name'] = dto.name;
    if (dto.role !== undefined) data['role'] = dto.role;
    if (dto.permissions !== undefined || dto.role !== undefined) {
      const resolvedRole = dto.role ?? existingUser.role;
      data['permissions'] = this.resolvePermissions(resolvedRole, dto.permissions);
    }
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive;
    if (dto.password) {
      data['password'] = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    }

    const user = await this.prismaService.user.update({
      where: { id },
      data,
    });

    return this.toResponse(user);
  }

  getPermissionsMetadata() {
    return {
      allPermissions: [...ALL_PERMISSIONS].sort((a, b) => a.localeCompare(b, SORT_LOCALE)),
      roleDefaults: {
        [UserRole.ADMIN]: this.resolvePermissions(UserRole.ADMIN),
        [UserRole.EDITOR]: this.resolvePermissions(UserRole.EDITOR),
        [UserRole.VIEWER]: this.resolvePermissions(UserRole.VIEWER),
      },
    };
  }

  /** Soft delete — sets isActive = false, never removes from DB */
  async deactivate(id: string): Promise<UserResponseDto> {
    await this.findOne(id);

    const user = await this.prismaService.user.update({
      where: { id },
      data: { isActive: false },
    });

    return this.toResponse(user);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private resolvePermissions(role: UserRole, explicitPermissions?: string[]): string[] {
    const resolved = resolvePermissionsForRole(
      role,
      explicitPermissions?.map((permission) => permission.trim()).filter(Boolean),
    );
    return resolved.sort((left, right) => left.localeCompare(right, SORT_LOCALE));
  }
}
