import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { CACHE_INVALIDATION_QUEUE } from '../queue.constants';
import type { CacheInvalidationJobType } from '../queue.constants';
import type { WorkerRedisService } from '../services/worker-redis.service';

export interface CacheInvalidationJobPayload {
  type: CacheInvalidationJobType;
  channelId?: string;
}

export class CacheInvalidationProcessor {
  private worker?: Worker<CacheInvalidationJobPayload>;

  constructor(private readonly redisService: WorkerRedisService) {}

  start(): Worker<CacheInvalidationJobPayload> {
    this.worker = new Worker<CacheInvalidationJobPayload>(
      CACHE_INVALIDATION_QUEUE,
      (job) => this.process(job),
      {
        connection: this.redisService.createBullConnection(),
      },
    );

    this.worker.on('completed', (job) => {
      console.log(`[worker] cache invalidation completed: ${job.name}`);
    });
    this.worker.on('failed', (job, error) => {
      console.warn(`[worker] cache invalidation failed: ${job?.name} ${error.message}`);
    });

    return this.worker;
  }

  async close(): Promise<void> {
    await this.worker?.close();
  }

  private async process(job: Job<CacheInvalidationJobPayload>): Promise<void> {
    const patterns = this.resolvePatterns(job.data);
    const deletedCounts = await Promise.all(
      patterns.map((pattern) => this.redisService.deleteByPattern(pattern)),
    );
    const totalDeleted = deletedCounts.reduce((total, count) => total + count, 0);

    console.log(`[worker] invalidated ${totalDeleted} cache keys for ${job.data.type}`);
  }

  private resolvePatterns(payload: CacheInvalidationJobPayload): string[] {
    switch (payload.type) {
      case 'CHANNEL_SCHEDULE':
        return [
          this.publicSchedulesPattern(payload.channelId),
          this.timelinePattern(payload.channelId),
        ];
      case 'PUBLIC_SCHEDULES':
        return [this.publicSchedulesPattern(payload.channelId)];
      case 'PUBLIC_CHANNELS':
        return ['epg:public:channels:*'];
      case 'TIMELINE':
        return [this.timelinePattern(payload.channelId)];
      case 'ALL_SCHEDULE_CACHES':
        return ['epg:public:schedules:*', 'epg:public:channels:*', 'epg:timeline:*'];
    }
  }

  private publicSchedulesPattern(channelId?: string): string {
    return channelId ? `epg:public:schedules:*channelId=${channelId}*` : 'epg:public:schedules:*';
  }

  private timelinePattern(channelId?: string): string {
    return channelId ? `epg:timeline:*channelId=${channelId}*` : 'epg:timeline:*';
  }
}
