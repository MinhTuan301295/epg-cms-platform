export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // Channels
  CHANNELS_VIEW: 'channels.view',
  CHANNELS_CREATE: 'channels.create',
  CHANNELS_UPDATE: 'channels.update',
  CHANNELS_DELETE: 'channels.delete',

  // Assets
  ASSETS_VIEW: 'assets.view',
  ASSETS_CREATE: 'assets.create',
  ASSETS_UPDATE: 'assets.update',
  ASSETS_DELETE: 'assets.delete',

  // Schedules
  SCHEDULES_VIEW: 'schedules.view',
  SCHEDULES_CREATE: 'schedules.create',
  SCHEDULES_UPDATE: 'schedules.update',
  SCHEDULES_DELETE: 'schedules.delete',
  SCHEDULES_PUBLISH: 'schedules.publish',

  // Users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  // Audit Logs
  AUDIT_VIEW: 'audit.view',

  // Importer
  IMPORTER_VIEW: 'importer.view',
  IMPORTER_RUN: 'importer.run',

  // Operations
  OPERATIONS_VIEW: 'operations.view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);
