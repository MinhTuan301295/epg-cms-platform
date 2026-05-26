import { UserRole } from '@prisma/client';
import { ALL_PERMISSIONS, PERMISSIONS } from './permissions.constants';

/**
 * Default permissions assigned when a user's role is set but no explicit
 * permissions are configured. ADMIN always bypasses permission checks entirely,
 * so its list here is only used for seeding / display purposes.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: [...ALL_PERMISSIONS],
  [UserRole.EDITOR]: [
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
  [UserRole.VIEWER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.OPERATIONS_VIEW,
    PERMISSIONS.CHANNELS_VIEW,
    PERMISSIONS.ASSETS_VIEW,
    PERMISSIONS.SCHEDULES_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.IMPORTER_VIEW,
  ],
};

/**
 * Role permission scope:
 * - ADMIN: unrestricted
 * - EDITOR: operational write scope (no user management)
 * - VIEWER: read-only operational scope
 */
export const ROLE_PERMISSION_SCOPE: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: [...ALL_PERMISSIONS],
  [UserRole.EDITOR]: [
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
  [UserRole.VIEWER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.OPERATIONS_VIEW,
    PERMISSIONS.CHANNELS_VIEW,
    PERMISSIONS.ASSETS_VIEW,
    PERMISSIONS.SCHEDULES_VIEW,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.IMPORTER_VIEW,
  ],
};

export function resolvePermissionsForRole(role: UserRole, explicitPermissions?: string[]): string[] {
  const scope = new Set(ROLE_PERMISSION_SCOPE[role] ?? []);
  const source = explicitPermissions && explicitPermissions.length > 0
    ? explicitPermissions
    : ROLE_DEFAULT_PERMISSIONS[role] ?? [];

  const filtered = [...new Set(source.filter((permission) => scope.has(permission)))].sort();

  if (filtered.length > 0) {
    return filtered;
  }

  return [...(ROLE_DEFAULT_PERMISSIONS[role] ?? [])].sort();
}
