import { Inject, Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CacheService {
  constructor(@Inject(RedisService) private readonly redisService: RedisService) {}

  getRedis() {
    return this.redisService.getClient();
  }
}
