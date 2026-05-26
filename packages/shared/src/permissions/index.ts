export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  OPERATIONS_VIEW: 'operations.view',

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
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
