import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ScheduleStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export interface ScheduleOverlap {
  id: string;
  name: string;
  startTime: Date;
  stopTime: Date;
}

@Injectable()
export class OverlapService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  findOverlaps(
    channelId: string,
    startTime: Date,
    stopTime: Date,
    excludeScheduleId?: string,
  ): Promise<ScheduleOverlap[]> {
    return this.prismaService.schedule.findMany({
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
          lt: stopTime,
        },
        stopTime: {
          gt: startTime,
        },
      },
      select: {
        id: true,
        name: true,
        startTime: true,
        stopTime: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async assertNoOverlap(
    channelId: string,
    startTime: Date,
    stopTime: Date,
    excludeScheduleId?: string,
  ): Promise<void> {
    const [overlap] = await this.findOverlaps(channelId, startTime, stopTime, excludeScheduleId);

    if (!overlap) {
      return;
    }

    throw new ConflictException({
      message: 'Schedule overlaps with existing schedule on the same channel.',
      existingSchedule: {
        id: overlap.id,
        name: overlap.name,
        startTime: overlap.startTime,
        stopTime: overlap.stopTime,
      },
    });
  }
}
