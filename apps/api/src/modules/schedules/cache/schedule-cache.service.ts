import { Inject, Injectable, Logger } from '@nestjs/common';
import { CacheKeyUtil } from '../../../cache/cache-key.util';
import { RedisService } from '../../../redis/redis.service';

@Injectable()
export class ScheduleCacheService {
  private readonly logger = new Logger(ScheduleCacheService.name);

  constructor(@Inject(RedisService) private readonly redisService: RedisService) {}

  async invalidateChannel(channelId: string): Promise<void> {
    await Promise.all([
      this.invalidatePublicSchedules(channelId),
      this.invalidateTimeline(channelId),
    ]);
  }

  async invalidatePublicSchedules(channelId?: string): Promise<void> {
    const pattern = CacheKeyUtil.publicSchedulesPattern(channelId);
    const deleted = await this.redisService.deleteByPattern(pattern);
    this.logger.debug(`[CACHE INVALIDATE] public schedules: ${deleted}`);
  }

  async invalidatePublicChannels(): Promise<void> {
    const deleted = await this.redisService.deleteByPattern(CacheKeyUtil.publicChannelsPattern());
    this.logger.debug(`[CACHE INVALIDATE] public channels: ${deleted}`);
  }

  async invalidateTimeline(channelId?: string): Promise<void> {
    const pattern = CacheKeyUtil.timelinePattern(channelId);
    const deleted = await this.redisService.deleteByPattern(pattern);
    this.logger.debug(`[CACHE INVALIDATE] timeline: ${deleted}`);
  }

  async invalidateAllScheduleCaches(): Promise<void> {
    await Promise.all([
      this.invalidatePublicSchedules(),
      this.invalidatePublicChannels(),
      this.invalidateTimeline(),
    ]);
  }

  async invalidateChannelSchedule(channelId: string): Promise<void> {
    await this.invalidateTimeline(channelId);
  }

  async invalidatePublicScheduleCache(channelId: string): Promise<void> {
    await this.invalidatePublicSchedules(channelId);
  }
}
