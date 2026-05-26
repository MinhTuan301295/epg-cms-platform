import { Inject, Injectable } from '@nestjs/common';
import { TIMELINE_SNAPSHOT_QUEUE } from '../queue.constants';
import { QueueService } from '../queue.service';

export interface TimelineSnapshotJobPayload {
  channelId?: string;
  from?: string;
  to?: string;
  date?: string;
}

@Injectable()
export class TimelineSnapshotProducer {
  constructor(@Inject(QueueService) private readonly queueService: QueueService) {}

  addGenerateTimelineSnapshotJob(channelId: string, from: Date | string, to: Date | string) {
    return this.queueService.addJob<TimelineSnapshotJobPayload>(
      TIMELINE_SNAPSHOT_QUEUE,
      'GENERATE_TIMELINE_SNAPSHOT',
      {
        channelId,
        from: this.toIsoString(from),
        to: this.toIsoString(to),
      },
    );
  }

  addGenerateDailyTimelineSnapshotJob(date: string) {
    return this.queueService.addJob<TimelineSnapshotJobPayload>(
      TIMELINE_SNAPSHOT_QUEUE,
      'GENERATE_DAILY_TIMELINE_SNAPSHOT',
      {
        date,
      },
    );
  }

  private toIsoString(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : value;
  }
}
