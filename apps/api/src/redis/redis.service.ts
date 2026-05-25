import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client?: Redis;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  getClient(): Redis {
    this.client ??= new Redis(this.configService.get<string>('REDIS_URL', 'redis://localhost:6379'));
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit();
  }
}
