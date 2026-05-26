import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type ScheduleAuditAction = 'CANCEL' | 'CREATE' | 'IMPORT_CREATE' | 'PUBLISH' | 'UPDATE';

export interface CreateScheduleAuditLogInput {
  scheduleId: string;
  action: ScheduleAuditAction;
  beforeData?: unknown;
  afterData?: unknown;
  changedById?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  createScheduleAuditLog(input: CreateScheduleAuditLogInput) {
    return this.prismaService.scheduleAuditLog.create({
      data: {
        scheduleId: input.scheduleId,
        action: input.action,
        beforeData: this.toJsonInput(input.beforeData),
        afterData: this.toJsonInput(input.afterData),
        changedById: input.changedById,
      },
    });
  }

  findAll(limit = 100) {
    const take = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100;

    return this.prismaService.scheduleAuditLog.findMany({
      take,
      orderBy: {
        changedAt: 'desc',
      },
      include: {
        changedBy: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        schedule: {
          select: {
            id: true,
            name: true,
            channelId: true,
            status: true,
            version: true,
          },
        },
      },
    });
  }

  private toJsonInput(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
