import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import type { JobsOptions, QueueOptions } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { QUEUE_JOB_OPTIONS } from './queue.constants';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue<unknown, unknown, string>>();

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  getQueue(name: string): Queue<unknown, unknown, string> {
    const existingQueue = this.queues.get(name);

    if (existingQueue) {
      return existingQueue;
    }

    const queue = new Queue<unknown, unknown, string>(name, {
      connection: this.createRedisOptions(),
      defaultJobOptions: QUEUE_JOB_OPTIONS,
    } satisfies QueueOptions);

    this.queues.set(name, queue as Queue<unknown, unknown, string>);
    return queue;
  }

  async addJob<TPayload>(
    queueName: string,
    jobName: string,
    payload: TPayload,
    options?: JobsOptions,
  ) {
    const queue = this.getQueue(queueName);
    const typedJobName = jobName as Parameters<typeof queue.add>[0];

    return queue.add(typedJobName, payload, {
      ...QUEUE_JOB_OPTIONS,
      ...options,
    });
  }

  async getJob(queueName: string, jobId: string) {
    const queue = this.getQueue(queueName);
    return queue.getJob(jobId);
  }

  async getQueueCounts(queueName: string) {
    const queue = this.getQueue(queueName);
    return queue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed', 'paused');
  }

  async getRecentJobs(queueName: string, limit = 5) {
    const queue = this.getQueue(queueName);
    const jobs = await queue.getJobs(['active', 'waiting', 'delayed', 'failed', 'completed'], 0, Math.max(limit - 1, 0), false);

    return Promise.all(
      jobs.map(async (job) => ({
        id: String(job.id),
        name: job.name,
        state: await job.getState(),
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        finishedOn: job.finishedOn ?? null,
        failedReason: job.failedReason ?? null,
      })),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }

  private createRedisOptions(): RedisOptions {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      return this.createRedisOptionsFromUrl(redisUrl);
    }

    return {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.getNumberConfig('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      db: this.getNumberConfig('REDIS_DB', 0),
      maxRetriesPerRequest: null,
    };
  }

  private getNumberConfig(key: string, fallback: number): number {
    const value = this.configService.get<string>(key);
    const parsedValue = value === undefined || value === '' ? fallback : Number(value);

    if (!Number.isFinite(parsedValue)) {
      this.logger.warn(`Invalid ${key}; using ${fallback}`);
      return fallback;
    }

    return parsedValue;
  }

  private createRedisOptionsFromUrl(redisUrl: string): RedisOptions {
    const url = new URL(redisUrl);

    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 6379,
      username: url.username || undefined,
      password: url.password || undefined,
      db: url.pathname ? Number(url.pathname.replace('/', '')) || 0 : 0,
      maxRetriesPerRequest: null,
    };
  }
}
