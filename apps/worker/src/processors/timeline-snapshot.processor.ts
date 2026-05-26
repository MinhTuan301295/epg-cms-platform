import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { TIMELINE_SNAPSHOT_QUEUE } from '../queue.constants';
import type { WorkerPrismaService } from '../services/worker-prisma.service';
import type { WorkerRedisService } from '../services/worker-redis.service';

export interface TimelineSnapshotJobPayload {
  channelId?: string;
  from?: string;
  to?: string;
  date?: string;
}

export class TimelineSnapshotProcessor {
  private worker?: Worker<TimelineSnapshotJobPayload>;

  constructor(
    private readonly redisService: WorkerRedisService,
    private readonly prismaService: WorkerPrismaService,
  ) {}

  start(): Worker<TimelineSnapshotJobPayload> {
    this.worker = new Worker<TimelineSnapshotJobPayload>(
      TIMELINE_SNAPSHOT_QUEUE,
      (job) => this.process(job),
      {
        connection: this.redisService.createBullConnection(),
      },
    );

    this.worker.on('completed', (job) => {
      console.log(`[worker] timeline snapshot job completed: ${job.name}`);
    });
    this.worker.on('failed', (job, error) => {
      console.warn(`[worker] timeline snapshot job failed: ${job?.name} ${error.message}`);
    });

    return this.worker;
  }

  async close(): Promise<void> {
    await this.worker?.close();
  }

  private async process(job: Job<TimelineSnapshotJobPayload>): Promise<void> {
    const scheduleCount =
      job.data.channelId && job.data.from && job.data.to
        ? await this.prismaService.client.schedule.count({
            where: {
              channelId: job.data.channelId,
              startTime: {
                lt: new Date(job.data.to),
              },
              stopTime: {
                gt: new Date(job.data.from),
              },
            },
          })
        : 0;

    console.log('[worker] timeline snapshot placeholder', {
      ...job.data,
      scheduleCount,
    });
  }
}
