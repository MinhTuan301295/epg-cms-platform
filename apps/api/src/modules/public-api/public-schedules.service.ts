import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ScheduleStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { CACHE_TTL_SECONDS } from '../../cache/cache.constants';
import { CacheKeyUtil } from '../../cache/cache-key.util';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import type { QueryPublicChannelsDto } from './dto/query-public-channels.dto';
import type { QueryPublicSchedulesDto } from './dto/query-public-schedules.dto';

const publicScheduleLimit = 200;
const cacheHitLogPrefix = '[CACHE HIT]';
const cacheMissLogPrefix = '[CACHE MISS]';

@Injectable()
export class PublicSchedulesService {
  private readonly logger = new Logger(PublicSchedulesService.name);

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(RedisService) private readonly redisService: RedisService,
  ) {}

  async getPublicChannels(query: QueryPublicChannelsDto) {
    const cacheKey = CacheKeyUtil.publicChannels({
      activeOnly: query.activeOnly ?? true,
      search: query.search?.trim(),
    });
    const cachedResponse = await this.getCachedResponse(cacheKey, 'public channels');

    if (cachedResponse) {
      return cachedResponse;
    }

    const activeOnly = query.activeOnly ?? true;
    const where: Prisma.ChannelWhereInput = {};
    const search = query.search?.trim();

    if (activeOnly) {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          epgId: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const channels = await this.prismaService.channel.findMany({
      where,
      select: {
        id: true,
        name: true,
        epgId: true,
        logoUrl: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const response = {
      data: channels,
    };

    await this.setCachedResponse(
      cacheKey,
      response,
      CACHE_TTL_SECONDS.PUBLIC_CHANNELS,
      'public channels',
    );

    return response;
  }

  async getPublicSchedules(query: QueryPublicSchedulesDto) {
    const cacheKey = CacheKeyUtil.publicSchedules({
      channelId: query.channelId,
      date: query.date,
      from: query.from,
      to: query.to,
    });
    const cachedResponse = await this.getCachedResponse(cacheKey, 'public schedules');

    if (cachedResponse) {
      return cachedResponse;
    }

    const where = this.buildScheduleWhere(query);

    const schedules = await this.prismaService.schedule.findMany({
      where,
      select: {
        id: true,
        name: true,
        startTime: true,
        stopTime: true,
        duration: true,
        status: true,
        channel: {
          select: {
            id: true,
            name: true,
            epgId: true,
            logoUrl: true,
          },
        },
        asset: {
          select: {
            id: true,
            name: true,
            type: true,
            duration: true,
            posterUrl: true,
            thumbnailUrl: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      take: publicScheduleLimit,
    });

    const response = {
      data: schedules,
    };

    await this.setCachedResponse(
      cacheKey,
      response,
      CACHE_TTL_SECONDS.PUBLIC_SCHEDULES,
      'public schedules',
    );

    return response;
  }

  private buildScheduleWhere(query: QueryPublicSchedulesDto): Prisma.ScheduleWhereInput {
    const where: Prisma.ScheduleWhereInput = {
      status: ScheduleStatus.PUBLISHED,
    };

    if (query.channelId) {
      where.channelId = query.channelId;
    }

    const range = this.resolveDateRange(query);

    if (range) {
      where.AND = [
        {
          startTime: {
            lt: range.to,
          },
        },
        {
          stopTime: {
            gt: range.from,
          },
        },
      ];
    } else {
      where.startTime = {
        gte: new Date(),
      };
    }

    return where;
  }

  private resolveDateRange(query: QueryPublicSchedulesDto): { from: Date; to: Date } | undefined {
    if (query.date) {
      return this.parseUtcDay(query.date);
    }

    if (!query.from && !query.to) {
      return undefined;
    }

    const from = query.from ? this.parseDateTime(query.from, 'from') : new Date(0);
    const to = query.to ? this.parseDateTime(query.to, 'to') : new Date('9999-12-31T23:59:59.999Z');

    if (to <= from) {
      throw new BadRequestException('Query to must be after from');
    }

    return { from, to };
  }

  private parseUtcDay(date: string): { from: Date; to: Date } {
    const from = new Date(`${date}T00:00:00.000Z`);

    if (Number.isNaN(from.getTime())) {
      throw new BadRequestException('Invalid date filter');
    }

    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 1);

    return { from, to };
  }

  private parseDateTime(value: string, fieldName: string): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }

    return date;
  }

  private async getCachedResponse<TResponse>(
    key: string,
    label: string,
  ): Promise<TResponse | null> {
    const cached = await this.redisService.get(key);

    if (!cached) {
      this.logger.debug(`${cacheMissLogPrefix} ${label}`);
      return null;
    }

    try {
      this.logger.debug(`${cacheHitLogPrefix} ${label}`);
      return JSON.parse(cached) as TResponse;
    } catch {
      await this.redisService.del(key);
      this.logger.warn(`Invalid cached JSON cleared for ${label}`);
      return null;
    }
  }

  private async setCachedResponse(
    key: string,
    response: unknown,
    ttlSeconds: number,
    label: string,
  ): Promise<void> {
    await this.redisService.set(key, JSON.stringify(response), ttlSeconds);
    this.logger.debug(`Cached ${label}`);
  }
}
