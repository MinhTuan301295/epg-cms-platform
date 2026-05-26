export const CACHE_PREFIX = {
  PUBLIC_SCHEDULES: 'epg:public:schedules',
  PUBLIC_CHANNELS: 'epg:public:channels',
  TIMELINE: 'epg:timeline',
} as const;

export const CACHE_TTL_SECONDS = {
  PUBLIC_SCHEDULES: 60,
  PUBLIC_CHANNELS: 300,
  TIMELINE: 30,
} as const;
