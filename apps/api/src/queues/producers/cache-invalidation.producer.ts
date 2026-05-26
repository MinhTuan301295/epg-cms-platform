import { Inject, Injectable } from '@nestjs/common';
import { CACHE_INVALIDATION_QUEUE } from '../queue.constants';
import type { CacheInvalidationJobType } from '../queue.constants';
import { QueueService } from '../queue.service';

export interface CacheInvalidationJobPayload {
  type: CacheInvalidationJobType;
  channelId?: string;
}

@Injectable()
export class CacheInvalidationProducer {
  constructor(@Inject(QueueService) private readonly queueService: QueueService) {}

  addInvalidateChannelScheduleJob(channelId: string) {
    return this.addJob({
      type: 'CHANNEL_SCHEDULE',
      channelId,
    });
  }

  addInvalidatePublicSchedulesJob(channelId?: string) {
    return this.addJob({
      type: 'PUBLIC_SCHEDULES',
      channelId,
    });
  }

  addInvalidatePublicChannelsJob() {
    return this.addJob({
      type: 'PUBLIC_CHANNELS',
    });
  }

  addInvalidateTimelineJob(channelId?: string) {
    return this.addJob({
      type: 'TIMELINE',
      channelId,
    });
  }

  addInvalidateAllScheduleCachesJob() {
    return this.addJob({
      type: 'ALL_SCHEDULE_CACHES',
    });
  }

  private addJob(payload: CacheInvalidationJobPayload) {
    return this.queueService.addJob(CACHE_INVALIDATION_QUEUE, payload.type, payload);
  }
}
