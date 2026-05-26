import IORedis from 'ioredis';
import type { Redis, RedisOptions } from 'ioredis';

export class WorkerRedisService {
  private commandClient?: Redis;

  createBullConnection(): Redis {
    return new IORedis({
      ...this.createRedisOptions(),
      maxRetriesPerRequest: null,
    });
  }

  getClient(): Redis {
    this.commandClient ??= new IORedis(this.createRedisOptions());
    return this.commandClient;
  }

  async deleteByPattern(pattern: string): Promise<number> {
    const client = this.getClient();
    let cursor = '0';
    let deletedCount = 0;

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        deletedCount += await client.del(...keys);
      }
    } while (cursor !== '0');

    return deletedCount;
  }

  async disconnect(): Promise<void> {
    if (!this.commandClient) {
      return;
    }

    await this.commandClient.quit();
  }

  private createRedisOptions(): RedisOptions {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      return this.createRedisOptionsFromUrl(redisUrl);
    }

    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: this.getNumberEnv('REDIS_PORT', 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      db: this.getNumberEnv('REDIS_DB', 0),
    };
  }

  private getNumberEnv(key: string, fallback: number): number {
    const value = process.env[key];
    const parsedValue = value === undefined || value === '' ? fallback : Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }

  private createRedisOptionsFromUrl(redisUrl: string): RedisOptions {
    const url = new URL(redisUrl);

    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 6379,
      username: url.username || undefined,
      password: url.password || undefined,
      db: url.pathname ? Number(url.pathname.replace('/', '')) || 0 : 0,
    };
  }
}
