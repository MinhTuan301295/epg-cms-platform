export const CACHE_INVALIDATION_QUEUE = 'cache-invalidation';
export const SCHEDULE_PUBLISH_QUEUE = 'schedule-publish';
export const IMPORTER_QUEUE = 'epg-importer';
export const TIMELINE_SNAPSHOT_QUEUE = 'timeline-snapshot';

export type CacheInvalidationJobType =
  | 'ALL_SCHEDULE_CACHES'
  | 'CHANNEL_SCHEDULE'
  | 'PUBLIC_CHANNELS'
  | 'PUBLIC_SCHEDULES'
  | 'TIMELINE';

export type ImporterJobType = 'CSV' | 'EXTERNAL_API' | 'XMLTV';
