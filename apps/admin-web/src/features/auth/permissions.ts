import type { StoredUser } from '../../utils/token-storage';

export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  CHANNELS_VIEW: 'channels.view',
  CHANNELS_CREATE: 'channels.create',
  CHANNELS_UPDATE: 'channels.update',
  CHANNELS_DELETE: 'channels.delete',
  ASSETS_VIEW: 'assets.view',
  ASSETS_CREATE: 'assets.create',
  ASSETS_UPDATE: 'assets.update',
  ASSETS_DELETE: 'assets.delete',
  SCHEDULES_VIEW: 'schedules.view',
  SCHEDULES_CREATE: 'schedules.create',
  SCHEDULES_UPDATE: 'schedules.update',
  SCHEDULES_DELETE: 'schedules.delete',
  SCHEDULES_PUBLISH: 'schedules.publish',
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  AUDIT_VIEW: 'audit.view',
  IMPORTER_VIEW: 'importer.view',
  IMPORTER_RUN: 'importer.run',
  OPERATIONS_VIEW: 'operations.view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_DEFAULT_PERMISSIONS: Record<StoredUser['role'], string[]> = {
  ADMIN: Object.values(PERMISSIONS),
  EDITOR: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.OPERATIONS_VIEW,
    PERMISSIONS.CHANNELS_VIEW,
    PERMISSIONS.CHANNELS_CREATE,
    PERMISSIONS.CHANNELS_UPDATE,
    PERMISSIONS.CHANNELS_DELETE,
    PERMISSIONS.ASSETS_VIEW,
    PERMISSIONS.ASSETS_CREATE,
    PERMISSIONS.ASSETS_UPDATE,
    PERMISSIONS.ASSETS_DELETE,
    PERMISSIONS.SCHEDULES_VIEW,
    PERMISSIONS.SCHEDULES_CREATE,
    PERMISSIONS.SCHEDULES_UPDATE,
    PERMISSIONS.SCHEDULES_DELETE,
    PERMISSIONS.SCHEDULES_PUBLISH,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.IMPORTER_VIEW,
    PERMISSIONS.IMPORTER_RUN,
  ],
  VIEWER: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.OPERATIONS_VIEW,
    PERMISSIONS.CHANNELS_VIEW,
    PERMISSIONS.ASSETS_VIEW,
    PERMISSIONS.SCHEDULES_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.IMPORTER_VIEW,
  ],
};

function resolveEffectivePermissions(user: StoredUser): string[] {
  if (user.permissions && user.permissions.length > 0) {
    return user.permissions;
  }

  return ROLE_DEFAULT_PERMISSIONS[user.role] ?? [];
}

export function hasPermission(user: StoredUser | undefined, permission: string): boolean {
  if (!user) {
    return false;
  }

  if (user.role === 'ADMIN') {
    return true;
  }

  return resolveEffectivePermissions(user).includes(permission);
}

export function hasAllPermissions(user: StoredUser | undefined, permissions: string[]): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

export function hasAnyPermission(user: StoredUser | undefined, permissions: string[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}
