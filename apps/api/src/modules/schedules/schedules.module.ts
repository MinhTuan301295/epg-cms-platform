import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { QueuesModule } from '../../queues/queues.module';
import { AutoSnapService } from './auto-snap/auto-snap.service';
import { ScheduleCacheService } from './cache/schedule-cache.service';
import { ConflictEngineService } from './conflict-engine/conflict-engine.service';
import { GapDetectorService } from './gap-detector/gap-detector.service';
import { OverlapService } from './overlap/overlap.service';
import { SchedulePublishService } from './publish/schedule-publish.service';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { ScheduleSnapshotService } from './snapshots/schedule-snapshot.service';
import { TimelineService } from './timeline/timeline.service';
import { ScheduleValidationService } from './validation/schedule-validation.service';

@Module({
  imports: [AuditLogsModule, QueuesModule],
  controllers: [SchedulesController],
  providers: [
    SchedulesService,
    TimelineService,
    ScheduleValidationService,
    OverlapService,
    SchedulePublishService,
    ScheduleSnapshotService,
    ConflictEngineService,
    GapDetectorService,
    AutoSnapService,
    ScheduleCacheService,
  ],
  exports: [SchedulesService],
})
export class SchedulesModule {}
