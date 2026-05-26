import { Inject, Injectable } from '@nestjs/common';
import { OverlapService } from '../overlap/overlap.service';

export interface ScheduleConflictInput {
  channelId: string;
  startTime: Date;
  stopTime: Date;
  excludeScheduleId?: string;
}

@Injectable()
export class ConflictEngineService {
  constructor(@Inject(OverlapService) private readonly overlapService: OverlapService) {}

  validateNoBlockingConflicts(input: ScheduleConflictInput): Promise<void> {
    return this.overlapService.assertNoOverlap(
      input.channelId,
      input.startTime,
      input.stopTime,
      input.excludeScheduleId,
    );
  }
}
