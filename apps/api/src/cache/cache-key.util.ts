import { CACHE_PREFIX } from './cache.constants';

type CacheParamValue = boolean | Date | number | string | null | undefined;

export class CacheKeyUtil {
  static publicSchedules(params: Record<string, CacheParamValue>): string {
    return this.fromParams(CACHE_PREFIX.PUBLIC_SCHEDULES, params);
  }

  static publicChannels(params: Record<string, CacheParamValue>): string {
    return this.fromParams(CACHE_PREFIX.PUBLIC_CHANNELS, params);
  }

  static timeline(channelId: string, from: Date | string, to: Date | string): string {
    return this.fromParams(CACHE_PREFIX.TIMELINE, {
      channelId,
      from,
      to,
    });
  }

  static currentSchedule(channelId: string, time: Date | string): string {
    return this.fromParams(`${CACHE_PREFIX.TIMELINE}:current`, {
      channelId,
      time,
    });
  }

  static nextSchedule(channelId: string, time: Date | string): string {
    return this.fromParams(`${CACHE_PREFIX.TIMELINE}:next`, {
      channelId,
      time,
    });
  }

  static publicSchedulesPattern(channelId?: string): string {
    return channelId
      ? `${CACHE_PREFIX.PUBLIC_SCHEDULES}:*channelId=${channelId}*`
      : `${CACHE_PREFIX.PUBLIC_SCHEDULES}:*`;
  }

  static publicChannelsPattern(): string {
    return `${CACHE_PREFIX.PUBLIC_CHANNELS}:*`;
  }

  static timelinePattern(channelId?: string): string {
    return channelId ? `${CACHE_PREFIX.TIMELINE}:*channelId=${channelId}*` : `${CACHE_PREFIX.TIMELINE}:*`;
  }

  private static fromParams(prefix: string, params: Record<string, CacheParamValue>): string {
    const entries = Object.entries(params)
      .filter((entry): entry is [string, Exclude<CacheParamValue, null | undefined>] => {
        const value = entry[1];
        return value !== undefined && value !== null && value !== '';
      })
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, value]) => `${key}=${this.serializeValue(value)}`);

    return entries.length > 0 ? `${prefix}:${entries.join(':')}` : `${prefix}:all`;
  }

  private static serializeValue(value: Exclude<CacheParamValue, null | undefined>): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return String(value);
  }
}
