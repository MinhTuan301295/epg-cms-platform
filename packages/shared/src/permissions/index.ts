export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  CHANNELS_READ: 'channels:read',
  CHANNELS_WRITE: 'channels:write',
  ASSETS_READ: 'assets:read',
  ASSETS_WRITE: 'assets:write',
  SCHEDULES_READ: 'schedules:read',
  SCHEDULES_WRITE: 'schedules:write',
  SCHEDULES_PUBLISH: 'schedules:publish',
  AUDIT_LOGS_READ: 'audit-logs:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
