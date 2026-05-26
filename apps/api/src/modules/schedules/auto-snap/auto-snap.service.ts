import { Inject, Injectable } from '@nestjs/common';
import { ScheduleStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AutoSnapService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async resolveAutoSnap(
    channelId: string,
    input: { startTime: Date },
    duration: number,
  ): Promise<{ startTime: Date; stopTime: Date }> {
    const previousSchedule = await this.prismaService.schedule.findFirst({
      where: {
        channelId,
        status: {
          not: ScheduleStatus.CANCELLED,
        },
        stopTime: {
          lte: input.startTime,
        },
      },
      orderBy: {
        stopTime: 'desc',
      },
    });

    const startTime = previousSchedule?.stopTime ?? input.startTime;

    return {
      startTime,
      stopTime: new Date(startTime.getTime() + duration * 1000),
    };
  }
}
