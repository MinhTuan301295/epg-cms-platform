import { Module } from '@nestjs/common';
import { QueuesModule } from '../../queues/queues.module';
import { ApiCacheMetricsService } from './api-cache-metrics.service';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [QueuesModule],
  controllers: [OperationsController],
  providers: [OperationsService, ApiCacheMetricsService],
  exports: [OperationsService, ApiCacheMetricsService],
})
export class OperationsModule {}
