import { Module } from '@nestjs/common';
import { ScheduleCacheService } from '../schedules/cache/schedule-cache.service';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';

@Module({
  controllers: [ChannelsController],
  providers: [ChannelsService, ScheduleCacheService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
