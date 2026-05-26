import { Inject, Injectable } from '@nestjs/common';
import { CacheKeyUtil } from '../../cache/cache-key.util';
import { PrismaService } from '../../database/prisma.service';
import {
  CACHE_INVALIDATION_QUEUE,
  IMPORTER_QUEUE,
  SCHEDULE_PUBLISH_QUEUE,
  TIMELINE_SNAPSHOT_QUEUE,
} from '../../queues/queue.constants';
import { QueueService } from '../../queues/queue.service';
import { RedisService } from '../../redis/redis.service';
import { ApiCacheMetricsService } from './api-cache-metrics.service';

interface QueueHealthItem {
  name: string;
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  paused: number;
}

export interface ImporterQueueHealthSnapshot {
  generatedAt: string;
  importer: {
    importedToday: number;
    latestImportAt: string | null;
  };
  queues: QueueHealthItem[];
  recentImporterJobs: Array<{
    id: string;
    name: string;
    state: string;
    attemptsMade: number;
    timestamp: number;
    finishedOn: number | null;
    failedReason: string | null;
  }>;
}

export interface ApiCacheMetricsSnapshot {
  generatedAt: string;
  api: ReturnType<ApiCacheMetricsService['getSnapshot']>;
  cacheKeys: {
    publicSchedules: number;
    publicChannels: number;
    timeline: number;
    total: number;
  };
}

const queueNames = [
  CACHE_INVALIDATION_QUEUE,
  SCHEDULE_PUBLISH_QUEUE,
  IMPORTER_QUEUE,
  TIMELINE_SNAPSHOT_QUEUE,
] as const;

@Injectable()
export class OperationsService {
  constructor(
    @Inject(QueueService) private readonly queueService: QueueService,
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(RedisService) private readonly redisService: RedisService,
    @Inject(ApiCacheMetricsService) private readonly apiCacheMetricsService: ApiCacheMetricsService,
  ) {}

  async getImporterQueueHealth(): Promise<ImporterQueueHealthSnapshot> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const [queues, recentImporterJobs, importedToday, latestImport] = await Promise.all([
      Promise.all(queueNames.map((name) => this.getQueueHealth(name))),
      this.queueService.getRecentJobs(IMPORTER_QUEUE, 10),
      this.prismaService.scheduleAuditLog.count({
        where: {
          action: 'IMPORT_CREATE',
          changedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
      this.prismaService.scheduleAuditLog.findFirst({
        where: {
          action: 'IMPORT_CREATE',
        },
        select: {
          changedAt: true,
        },
        orderBy: {
          changedAt: 'desc',
        },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      importer: {
        importedToday,
        latestImportAt: latestImport?.changedAt?.toISOString() ?? null,
      },
      queues,
      recentImporterJobs,
    };
  }

  async getApiCacheMetrics(): Promise<ApiCacheMetricsSnapshot> {
    const [apiSnapshot, publicScheduleKeys, publicChannelKeys, timelineKeys] = await Promise.all([
      Promise.resolve(this.apiCacheMetricsService.getSnapshot()),
      this.redisService.keys(CacheKeyUtil.publicSchedulesPattern()),
      this.redisService.keys(CacheKeyUtil.publicChannelsPattern()),
      this.redisService.keys(CacheKeyUtil.timelinePattern()),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      api: apiSnapshot,
      cacheKeys: {
        publicSchedules: publicScheduleKeys.length,
        publicChannels: publicChannelKeys.length,
        timeline: timelineKeys.length,
        total: publicScheduleKeys.length + publicChannelKeys.length + timelineKeys.length,
      },
    };
  }

  private async getQueueHealth(name: string): Promise<QueueHealthItem> {
    const counts = await this.queueService.getQueueCounts(name);

    return {
      name,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      delayed: counts.delayed ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      paused: counts.paused ?? 0,
    };
  }
}
