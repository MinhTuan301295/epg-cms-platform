import { Module } from '@nestjs/common';
import { ScheduleCacheService } from '../schedules/cache/schedule-cache.service';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, ScheduleCacheService],
  exports: [AssetsService],
})
export class AssetsModule {}
