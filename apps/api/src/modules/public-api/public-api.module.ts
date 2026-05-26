import { Module } from '@nestjs/common';
import { OperationsModule } from '../operations/operations.module';
import { PublicSchedulesController } from './public-schedules.controller';
import { PublicSchedulesService } from './public-schedules.service';

@Module({
  imports: [OperationsModule],
  controllers: [PublicSchedulesController],
  providers: [PublicSchedulesService],
})
export class PublicApiModule {}
