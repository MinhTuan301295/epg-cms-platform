import { Inject, Injectable } from '@nestjs/common';
import { ScheduleStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export interface ScheduleGapWarning {
  type: 'GAP_BEFORE' | 'GAP_AFTER';
  message: string;
  from: Date;
  to: Date;
}

@Injectable()
export class GapDetectorService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async detectGaps(
    channelId: string,
    startTime: Date,
    stopTime: Date,
    excludeScheduleId?: string,
  ): Promise<ScheduleGapWarning[]> {
    const [previousSchedule, nextSchedule] = await Promise.all([
      this.findPreviousSchedule(channelId, startTime, excludeScheduleId),
      this.findNextSchedule(channelId, stopTime, excludeScheduleId),
    ]);
    const warnings: ScheduleGapWarning[] = [];

    if (previousSchedule && previousSchedule.stopTime < startTime) {
      warnings.push({
        type: 'GAP_BEFORE',
        message: 'There is a gap before this schedule.',
        from: previousSchedule.stopTime,
        to: startTime,
      });
    }

    if (nextSchedule && stopTime < nextSchedule.startTime) {
      warnings.push({
        type: 'GAP_AFTER',
        message: 'There is a gap after this schedule.',
        from: stopTime,
        to: nextSchedule.startTime,
      });
    }

    return warnings;
  }

  findPreviousSchedule(channelId: string, startTime: Date, excludeScheduleId?: string) {
    return this.prismaService.schedule.findFirst({
      where: {
        channelId,
        status: {
          not: ScheduleStatus.CANCELLED,
        },
        id: excludeScheduleId
          ? {
              not: excludeScheduleId,
            }
          : undefined,
        stopTime: {
          lte: startTime,
        },
      },
      orderBy: {
        stopTime: 'desc',
      },
    });
  }

  findNextSchedule(channelId: string, stopTime: Date, excludeScheduleId?: string) {
    return this.prismaService.schedule.findFirst({
      where: {
        channelId,
        status: {
          not: ScheduleStatus.CANCELLED,
        },
        id: excludeScheduleId
          ? {
              not: excludeScheduleId,
            }
          : undefined,
        startTime: {
          gte: stopTime,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }
}
