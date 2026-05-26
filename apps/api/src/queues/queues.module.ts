import { Module } from '@nestjs/common';
import { CacheInvalidationProducer } from './producers/cache-invalidation.producer';
import { ImporterProducer } from './producers/importer.producer';
import { SchedulePublishProducer } from './producers/schedule-publish.producer';
import { TimelineSnapshotProducer } from './producers/timeline-snapshot.producer';
import { QueueService } from './queue.service';

@Module({
  providers: [
    QueueService,
    CacheInvalidationProducer,
    SchedulePublishProducer,
    ImporterProducer,
    TimelineSnapshotProducer,
  ],
  exports: [
    QueueService,
    CacheInvalidationProducer,
    SchedulePublishProducer,
    ImporterProducer,
    TimelineSnapshotProducer,
  ],
})
export class QueuesModule {}
