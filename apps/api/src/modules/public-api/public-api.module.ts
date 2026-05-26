import { Module } from '@nestjs/common';
import { PublicSchedulesController } from './public-schedules.controller';
import { PublicSchedulesService } from './public-schedules.service';

@Module({
  controllers: [PublicSchedulesController],
  providers: [PublicSchedulesService],
})
export class PublicApiModule {}
