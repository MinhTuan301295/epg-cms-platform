import { Inject, Injectable } from '@nestjs/common';
import { ScheduleStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { ImportConflict, ScheduleImportCandidate } from '../types/importer.types';

@Injectable()
export class ImportConflictValidator {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async detectConflicts(candidates: ScheduleImportCandidate[]): Promise<ImportConflict[]> {
    const conflicts = await Promise.all(candidates.map((candidate) => this.detectCandidateConflict(candidate)));

    return conflicts.filter((conflict): conflict is ImportConflict => Boolean(conflict));
  }

  private async detectCandidateConflict(candidate: ScheduleImportCandidate): Promise<ImportConflict | undefined> {
    if (!candidate.channelId) {
      return undefined;
    }

    const existingSchedule = await this.prismaService.schedule.findFirst({
      where: {
        channelId: candidate.channelId,
        status: {
          not: ScheduleStatus.CANCELLED,
        },
        startTime: {
          lt: new Date(candidate.stopTime),
        },
        stopTime: {
          gt: new Date(candidate.startTime),
        },
      },
      select: {
        id: true,
        name: true,
        startTime: true,
        stopTime: true,
        status: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    if (!existingSchedule) {
      return undefined;
    }

    return {
      type: 'OVERLAP',
      channelId: candidate.channelId,
      candidate,
      existingSchedule,
    };
  }
}
