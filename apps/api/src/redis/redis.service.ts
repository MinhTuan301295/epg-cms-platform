import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: Redis;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  getClient(): Redis {
    this.client ??= this.createClient();
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.getClient().get(key);
    } catch (error) {
      this.logError('Redis get failed', error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.getClient().set(key, value, 'EX', ttlSeconds);
        return;
      }

      await this.getClient().set(key, value);
    } catch (error) {
      this.logError('Redis set failed', error);
    }
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }

    try {
      return await this.getClient().del(...keys);
    } catch (error) {
      this.logError('Redis del failed', error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await this.getClient().exists(key)) === 1;
    } catch (error) {
      this.logError('Redis exists failed', error);
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      return (await this.getClient().expire(key, ttlSeconds)) === 1;
    } catch (error) {
      this.logError('Redis expire failed', error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    const foundKeys: string[] = [];

    try {
      let cursor = '0';

      do {
        const [nextCursor, keys] = await this.getClient().scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );

        cursor = nextCursor;
        foundKeys.push(...keys);
      } while (cursor !== '0');
    } catch (error) {
      this.logError('Redis scan failed', error);
    }

    return foundKeys;
  }

  async deleteByPattern(pattern: string): Promise<number> {
    let deletedCount = 0;

    try {
      let cursor = '0';

      do {
        const [nextCursor, keys] = await this.getClient().scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          deletedCount += await this.getClient().del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logError('Redis deleteByPattern failed', error);
      return deletedCount;
    }

    return deletedCount;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.quit();
    } catch (error) {
      this.logError('Redis quit failed', error);
      this.client.disconnect();
    }
  }

  private createClient(): Redis {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const options: RedisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => Math.min(times * 100, 2_000),
    };

    const client = redisUrl
      ? new Redis(redisUrl, options)
      : new Redis({
          ...options,
          host: this.configService.get<string>('REDIS_HOST', 'localhost'),
          port: this.getNumberConfig('REDIS_PORT', 6379),
          password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
          db: this.getNumberConfig('REDIS_DB', 0),
        });

    client.on('connect', () => this.logger.log('Redis connected'));
    client.on('ready', () => this.logger.log('Redis ready'));
    client.on('close', () => this.logger.warn('Redis connection closed'));
    client.on('reconnecting', () => this.logger.warn('Redis reconnecting'));
    client.on('error', (error) => this.logError('Redis connection error', error));

    return client;
  }

  private logError(message: string, error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    this.logger.warn(`${message}: ${detail}`);
  }

  private getNumberConfig(key: string, fallback: number): number {
    const value = this.configService.get<string>(key);
    const parsedValue = value === undefined || value === '' ? fallback : Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }
}
