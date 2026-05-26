import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { IMPORTER_QUEUE } from '../queue.constants';
import type { ImporterJobType } from '../queue.constants';
import type { WorkerRedisService } from '../services/worker-redis.service';

export interface ImporterJobPayload {
  type: ImporterJobType;
  sourceUrl?: string;
  filePath?: string;
  sourceName?: string;
}

export class ImporterProcessor {
  private worker?: Worker<ImporterJobPayload>;

  constructor(private readonly redisService: WorkerRedisService) {}

  start(): Worker<ImporterJobPayload> {
    this.worker = new Worker<ImporterJobPayload>(IMPORTER_QUEUE, (job) => this.process(job), {
      connection: this.redisService.createBullConnection(),
    });

    this.worker.on('completed', (job) => {
      console.log(`[worker] importer job completed: ${job.data.type}`);
    });
    this.worker.on('failed', (job, error) => {
      console.warn(`[worker] importer job failed: ${job?.data.type} ${error.message}`);
    });

    return this.worker;
  }

  async close(): Promise<void> {
    await this.worker?.close();
  }

  private async process(job: Job<ImporterJobPayload>): Promise<void> {
    console.log('[worker] importer placeholder', job.data);
  }
}
