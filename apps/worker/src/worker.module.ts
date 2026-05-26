import { CacheInvalidationProcessor } from './processors/cache-invalidation.processor';
import { ImporterProcessor } from './processors/importer.processor';
import { SchedulePublishProcessor } from './processors/schedule-publish.processor';
import { TimelineSnapshotProcessor } from './processors/timeline-snapshot.processor';
import { WorkerPrismaService } from './services/worker-prisma.service';
import { WorkerRedisService } from './services/worker-redis.service';

export class WorkerModule {
  private readonly redisService = new WorkerRedisService();
  private readonly prismaService = new WorkerPrismaService();
  private readonly processors = [
    new CacheInvalidationProcessor(this.redisService),
    new SchedulePublishProcessor(this.redisService, this.prismaService),
    new ImporterProcessor(this.redisService),
    new TimelineSnapshotProcessor(this.redisService, this.prismaService),
  ];

  start(): void {
    this.processors.forEach((processor) => processor.start());
    console.log('[worker] EPG worker started');
  }

  async close(): Promise<void> {
    await Promise.all(this.processors.map((processor) => processor.close()));
    await Promise.all([this.redisService.disconnect(), this.prismaService.disconnect()]);
    console.log('[worker] EPG worker stopped');
  }
}
