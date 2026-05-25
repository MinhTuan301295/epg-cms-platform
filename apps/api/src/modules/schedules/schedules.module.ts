import { Module } from '@nestjs/common';
import { AutoSnapService } from './auto-snap/auto-snap.service';
import { ScheduleCacheService } from './cache/schedule-cache.service';
import { ConflictEngineService } from './conflict-engine/conflict-engine.service';
import { GapDetectorService } from './gap-detector/gap-detector.service';
import { OverlapService } from './overlap/overlap.service';
import { PublishService } from './publish/publish.service';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { SnapshotsService } from './snapshots/snapshots.service';
import { TimelineService } from './timeline/timeline.service';
import { ScheduleValidationService } from './validation/schedule-validation.service';

@Module({
  controllers: [SchedulesController],
  providers: [
    SchedulesService,
    TimelineService,
    ScheduleValidationService,
    OverlapService,
    PublishService,
    SnapshotsService,
    ConflictEngineService,
    GapDetectorService,
    AutoSnapService,
    ScheduleCacheService,
  ],
  exports: [SchedulesService],
})
export class SchedulesModule {}
