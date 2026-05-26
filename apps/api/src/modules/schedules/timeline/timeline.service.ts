import { Inject, Injectable, Logger } from '@nestjs/common';
import { ScheduleStatus } from '@prisma/client';
import type { Schedule } from '@prisma/client';
import { CACHE_TTL_SECONDS } from '../../../cache/cache.constants';
import { CacheKeyUtil } from '../../../cache/cache-key.util';
import { PrismaService } from '../../../database/prisma.service';
import { RedisService } from '../../../redis/redis.service';

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(RedisService) private readonly redisService: RedisService,
  ) {}

  async getCurrentSchedule(channelId: string, time: Date): Promise<Schedule | null> {
    const cacheKey = CacheKeyUtil.currentSchedule(channelId, time);
    const cached = await this.getCached<Schedule>(cacheKey);

    if (cached) {
      return this.reviveScheduleDates(cached);
    }

    const schedule = await this.prismaService.schedule.findFirst({
      where: {
        channelId,
        status: {
          not: ScheduleStatus.CANCELLED,
        },
        startTime: {
          lte: time,
        },
        stopTime: {
          gt: time,
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    await this.setCached(cacheKey, schedule);

    return schedule;
  }

  async getNextSchedule(channelId: string, time: Date): Promise<Schedule | null> {
    const cacheKey = CacheKeyUtil.nextSchedule(channelId, time);
    const cached = await this.getCached<Schedule>(cacheKey);

    if (cached) {
      return this.reviveScheduleDates(cached);
    }

    const schedule = await this.prismaService.schedule.findFirst({
      where: {
        channelId,
        status: {
          not: ScheduleStatus.CANCELLED,
        },
        startTime: {
          gt: time,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    await this.setCached(cacheKey, schedule);

    return schedule;
  }

  async getTimelineRange(channelId: string, from: Date, to: Date): Promise<Schedule[]> {
    const cacheKey = CacheKeyUtil.timeline(channelId, from, to);
    const cached = await this.getCached<Schedule[]>(cacheKey);

    if (cached) {
      return cached.map((schedule) => this.reviveScheduleDates(schedule));
    }

    const schedules = await this.prismaService.schedule.findMany({
      where: {
        channelId,
        status: {
          not: ScheduleStatus.CANCELLED,
        },
        startTime: {
          lt: to,
        },
        stopTime: {
          gt: from,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    await this.setCached(cacheKey, schedules);

    return schedules;
  }

  private async getCached<TValue>(key: string): Promise<TValue | null> {
    const cached = await this.redisService.get(key);

    if (!cached) {
      return null;
    }

    try {
      this.logger.debug('[CACHE HIT] timeline');
      return JSON.parse(cached) as TValue;
    } catch {
      await this.redisService.del(key);
      this.logger.warn('Invalid cached timeline JSON cleared');
      return null;
    }
  }

  private async setCached(key: string, value: unknown): Promise<void> {
    await this.redisService.set(key, JSON.stringify(value), CACHE_TTL_SECONDS.TIMELINE);
  }

  private reviveScheduleDates(schedule: Schedule): Schedule {
    return {
      ...schedule,
      startTime: this.reviveDate(schedule.startTime),
      stopTime: this.reviveDate(schedule.stopTime),
      publishedAt: schedule.publishedAt ? this.reviveDate(schedule.publishedAt) : null,
      createdAt: this.reviveDate(schedule.createdAt),
      updatedAt: this.reviveDate(schedule.updatedAt),
    };
  }

  private reviveDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
  }
}
