import { Inject, Injectable } from '@nestjs/common';
import { SCHEDULE_PUBLISH_QUEUE } from '../queue.constants';
import { QueueService } from '../queue.service';

export interface SchedulePublishJobPayload {
  scheduleId: string;
  requestedById?: string;
}

@Injectable()
export class SchedulePublishProducer {
  constructor(@Inject(QueueService) private readonly queueService: QueueService) {}

  addPublishScheduleJob(scheduleId: string, requestedById?: string) {
    return this.queueService.addJob<SchedulePublishJobPayload>(
      SCHEDULE_PUBLISH_QUEUE,
      'PUBLISH_SCHEDULE',
      {
        scheduleId,
        requestedById,
      },
    );
  }
}
