import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ScheduleStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { RequestUser } from '../../../common/types/request-user.type';
import { PrismaService } from '../../../database/prisma.service';
import { CacheInvalidationProducer } from '../../../queues/producers/cache-invalidation.producer';
import { SchedulePublishProducer } from '../../../queues/producers/schedule-publish.producer';
import { TimelineSnapshotProducer } from '../../../queues/producers/timeline-snapshot.producer';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { ScheduleCacheService } from '../cache/schedule-cache.service';
import { ConflictEngineService } from '../conflict-engine/conflict-engine.service';
import { ScheduleValidationService } from '../validation/schedule-validation.service';

const publishScheduleInclude = {
  channel: {
    select: {
      id: true,
      name: true,
      epgId: true,
    },
  },
  asset: {
    select: {
      id: true,
      name: true,
      type: true,
      duration: true,
    },
  },
} satisfies Prisma.ScheduleInclude;

type PublishScheduleWithRelations = Prisma.ScheduleGetPayload<{
  include: typeof publishScheduleInclude;
}>;

export class PublishScheduleResponseDto {
  success!: boolean;
  message!: string;
  data!: PublishScheduleWithRelations;
}

@Injectable()
export class SchedulePublishService {
  private readonly logger = new Logger(SchedulePublishService.name);

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(ScheduleValidationService)
    private readonly scheduleValidationService: ScheduleValidationService,
    @Inject(ConflictEngineService) private readonly conflictEngineService: ConflictEngineService,
    @Inject(AuditLogsService) private readonly auditLogsService: AuditLogsService,
    @Inject(ScheduleCacheService)
    private readonly scheduleCacheService: ScheduleCacheService,
    @Inject(CacheInvalidationProducer)
    private readonly cacheInvalidationProducer: CacheInvalidationProducer,
    @Inject(SchedulePublishProducer)
    private readonly schedulePublishProducer: SchedulePublishProducer,
    @Inject(TimelineSnapshotProducer)
    private readonly timelineSnapshotProducer: TimelineSnapshotProducer,
  ) {}

  async publish(id: string, currentUser?: RequestUser): Promise<PublishScheduleResponseDto> {
    const existingSchedule = await this.prismaService.schedule.findUnique({
      where: { id },
      include: publishScheduleInclude,
    });

    if (!existingSchedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (existingSchedule.status === ScheduleStatus.CANCELLED) {
      throw new BadRequestException('Cancelled schedule cannot be published');
    }

    await this.validatePublishableSchedule(existingSchedule);

    const publishedSchedule = await this.prismaService.schedule.update({
      where: { id },
      data: {
        status: ScheduleStatus.PUBLISHED,
        publishedAt: new Date(),
        updatedById: currentUser?.id,
        version: {
          increment: 1,
        },
      },
      include: publishScheduleInclude,
    });

    await this.auditLogsService.createScheduleAuditLog({
      scheduleId: publishedSchedule.id,
      action: 'PUBLISH',
      beforeData: existingSchedule,
      afterData: publishedSchedule,
      changedById: currentUser?.id,
    });

    await this.invalidatePublishedSchedule(publishedSchedule.channelId);
    await this.enqueuePublishJobs(publishedSchedule, currentUser?.id);

    return {
      success: true,
      message: 'Schedule published successfully.',
      data: publishedSchedule,
    };
  }

  async invalidatePublishedSchedule(channelId: string): Promise<void> {
    await this.scheduleCacheService.invalidateChannel(channelId);
  }

  private async validatePublishableSchedule(schedule: PublishScheduleWithRelations): Promise<void> {
    await this.assertChannelExists(schedule.channelId);

    if (schedule.assetId) {
      await this.assertAssetExists(schedule.assetId);
    }

    this.scheduleValidationService.validateDuration(schedule.duration);
    this.scheduleValidationService.validateTimeRange(schedule.startTime, schedule.stopTime);
    this.scheduleValidationService.validateDurationMatchesRange(
      schedule.startTime,
      schedule.stopTime,
      schedule.duration,
    );

    await this.conflictEngineService.validateNoBlockingConflicts({
      channelId: schedule.channelId,
      startTime: schedule.startTime,
      stopTime: schedule.stopTime,
      excludeScheduleId: schedule.id,
    });
  }

  private async assertChannelExists(channelId: string): Promise<void> {
    const channel = await this.prismaService.channel.findUnique({
      where: { id: channelId },
      select: { id: true },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
  }

  private async assertAssetExists(assetId: string): Promise<void> {
    const asset = await this.prismaService.asset.findUnique({
      where: { id: assetId },
      select: { id: true },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
  }

  private async enqueuePublishJobs(
    schedule: PublishScheduleWithRelations,
    requestedById?: string,
  ): Promise<void> {
    try {
      await Promise.all([
        this.schedulePublishProducer.addPublishScheduleJob(schedule.id, requestedById),
        this.cacheInvalidationProducer.addInvalidatePublicSchedulesJob(schedule.channelId),
        this.cacheInvalidationProducer.addInvalidateTimelineJob(schedule.channelId),
        this.timelineSnapshotProducer.addGenerateTimelineSnapshotJob(
          schedule.channelId,
          schedule.startTime,
          schedule.stopTime,
        ),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to enqueue publish background jobs: ${message}`);
    }
  }
}
