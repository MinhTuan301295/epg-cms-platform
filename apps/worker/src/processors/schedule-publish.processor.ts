import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { SCHEDULE_PUBLISH_QUEUE } from '../queue.constants';
import type { WorkerPrismaService } from '../services/worker-prisma.service';
import type { WorkerRedisService } from '../services/worker-redis.service';

export interface SchedulePublishJobPayload {
  scheduleId: string;
  requestedById?: string;
}

export class SchedulePublishProcessor {
  private worker?: Worker<SchedulePublishJobPayload>;

  constructor(
    private readonly redisService: WorkerRedisService,
    private readonly prismaService: WorkerPrismaService,
  ) {}

  start(): Worker<SchedulePublishJobPayload> {
    this.worker = new Worker<SchedulePublishJobPayload>(
      SCHEDULE_PUBLISH_QUEUE,
      (job) => this.process(job),
      {
        connection: this.redisService.createBullConnection(),
      },
    );

    this.worker.on('completed', (job) => {
      console.log(`[worker] schedule publish job completed: ${job.data.scheduleId}`);
    });
    this.worker.on('failed', (job, error) => {
      console.warn(`[worker] schedule publish job failed: ${job?.data.scheduleId} ${error.message}`);
    });

    return this.worker;
  }

  async close(): Promise<void> {
    await this.worker?.close();
  }

  private async process(job: Job<SchedulePublishJobPayload>): Promise<void> {
    const schedule = await this.prismaService.client.schedule.findUnique({
      where: {
        id: job.data.scheduleId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        version: true,
      },
    });

    console.log('[worker] async publish placeholder', {
      requestedById: job.data.requestedById,
      schedule,
    });
  }
}
