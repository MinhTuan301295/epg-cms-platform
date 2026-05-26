import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { RequestUser } from '../types/request-user.type';

type AuthenticatedRequest = Request & { user?: RequestUser };

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Permissions decorator → pass through (JWT auth is enough)
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Missing authenticated user');
    }

    // ADMIN always has all permissions
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const userPermissions = new Set(user.permissions ?? []);
    const hasAll = requiredPermissions.every((p) => userPermissions.has(p));

    if (!hasAll) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
