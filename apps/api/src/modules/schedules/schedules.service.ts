import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ScheduleStatus } from '@prisma/client';
import type { Asset, Prisma, Schedule } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user.type';
import { PrismaService } from '../../database/prisma.service';
import { CacheInvalidationProducer } from '../../queues/producers/cache-invalidation.producer';
import { TimelineSnapshotProducer } from '../../queues/producers/timeline-snapshot.producer';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AutoSnapService } from './auto-snap/auto-snap.service';
import { ScheduleCacheService } from './cache/schedule-cache.service';
import { ConflictEngineService } from './conflict-engine/conflict-engine.service';
import type { CreateScheduleDto } from './dto/create-schedule.dto';
import type { QuerySchedulesDto } from './dto/query-schedules.dto';
import type {
  ScheduleMutationResponseDto,
  ScheduleResponseDto,
  SchedulesListResponseDto,
} from './dto/schedule-response.dto';
import type { UpdateScheduleDto } from './dto/update-schedule.dto';
import { GapDetectorService } from './gap-detector/gap-detector.service';
import { SchedulePublishService } from './publish/schedule-publish.service';
import type { PublishScheduleResponseDto } from './publish/schedule-publish.service';
import { ScheduleValidationService } from './validation/schedule-validation.service';

const scheduleInclude = {
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

type ScheduleWithRelations = Prisma.ScheduleGetPayload<{
  include: typeof scheduleInclude;
}>;

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(ScheduleValidationService)
    private readonly scheduleValidationService: ScheduleValidationService,
    @Inject(ConflictEngineService) private readonly conflictEngineService: ConflictEngineService,
    @Inject(GapDetectorService) private readonly gapDetectorService: GapDetectorService,
    @Inject(AutoSnapService) private readonly autoSnapService: AutoSnapService,
    @Inject(ScheduleCacheService) private readonly scheduleCacheService: ScheduleCacheService,
    @Inject(AuditLogsService) private readonly auditLogsService: AuditLogsService,
    @Inject(SchedulePublishService) private readonly schedulePublishService: SchedulePublishService,
    @Inject(CacheInvalidationProducer)
    private readonly cacheInvalidationProducer: CacheInvalidationProducer,
    @Inject(TimelineSnapshotProducer)
    private readonly timelineSnapshotProducer: TimelineSnapshotProducer,
  ) {}

  async findAll(query: QuerySchedulesDto): Promise<SchedulesListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhere(query);

    const [schedules, total] = await this.prismaService.$transaction([
      this.prismaService.schedule.findMany({
        where,
        include: scheduleInclude,
        orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
      }),
      this.prismaService.schedule.count({ where }),
    ]);

    return {
      data: schedules.map((schedule) => this.toResponse(schedule)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<ScheduleResponseDto> {
    const schedule = await this.findScheduleById(id);
    return this.toResponse(schedule);
  }

  async create(
    dto: CreateScheduleDto,
    currentUser?: RequestUser,
  ): Promise<ScheduleMutationResponseDto> {
    await this.assertChannelExists(dto.channelId);
    const asset = dto.assetId ? await this.findAssetById(dto.assetId) : null;
    const input = await this.buildCreateInput(dto, asset);

    await this.conflictEngineService.validateNoBlockingConflicts({
      channelId: dto.channelId,
      startTime: input.startTime,
      stopTime: input.stopTime,
    });

    const warnings = await this.gapDetectorService.detectGaps(
      dto.channelId,
      input.startTime,
      input.stopTime,
    );

    const schedule = await this.prismaService.schedule.create({
      data: {
        name: input.name,
        channelId: dto.channelId,
        assetId: dto.assetId,
        startTime: input.startTime,
        stopTime: input.stopTime,
        duration: input.duration,
        status: ScheduleStatus.DRAFT,
        version: 1,
        metadata: this.toJsonInput(dto.metadata),
        createdById: currentUser?.id,
      },
      include: scheduleInclude,
    });

    await this.auditLogsService.createScheduleAuditLog({
      scheduleId: schedule.id,
      action: 'CREATE',
      afterData: schedule,
      changedById: currentUser?.id,
    });
    await this.invalidateScheduleCache(dto.channelId);
    await this.enqueueScheduleJobs(schedule);

    return {
      data: this.toResponse(schedule),
      warnings,
    };
  }

  async update(
    id: string,
    dto: UpdateScheduleDto,
    currentUser?: RequestUser,
  ): Promise<ScheduleMutationResponseDto> {
    const existingSchedule = await this.findRawScheduleById(id);
    this.validateStatusTransition(existingSchedule, dto);
    const input = await this.buildUpdateInput(dto, existingSchedule);

    await this.conflictEngineService.validateNoBlockingConflicts({
      channelId: input.channelId,
      startTime: input.startTime,
      stopTime: input.stopTime,
      excludeScheduleId: id,
    });

    const warnings = await this.gapDetectorService.detectGaps(
      input.channelId,
      input.startTime,
      input.stopTime,
      id,
    );

    const schedule = await this.prismaService.schedule.update({
      where: { id },
      data: {
        name: input.name,
        channelId: dto.channelId,
        assetId: dto.assetId,
        startTime: input.persistStartTime ? input.startTime : undefined,
        stopTime: input.persistStopTime ? input.stopTime : undefined,
        duration: input.persistDuration ? input.duration : undefined,
        status: dto.status,
        metadata: dto.metadata === undefined ? undefined : this.toJsonInput(dto.metadata),
        updatedById: currentUser?.id,
        version: {
          increment: 1,
        },
      },
      include: scheduleInclude,
    });

    await this.auditLogsService.createScheduleAuditLog({
      scheduleId: schedule.id,
      action: 'UPDATE',
      beforeData: existingSchedule,
      afterData: schedule,
      changedById: currentUser?.id,
    });
    await this.invalidateScheduleCache(input.channelId, existingSchedule.channelId);
    await this.enqueueScheduleJobs(schedule, existingSchedule.channelId);

    return {
      data: this.toResponse(schedule),
      warnings,
    };
  }

  async remove(id: string, currentUser?: RequestUser): Promise<ScheduleResponseDto> {
    const existingSchedule = await this.findRawScheduleById(id);

    const schedule = await this.prismaService.schedule.update({
      where: { id },
      data: {
        status: ScheduleStatus.CANCELLED,
        updatedById: currentUser?.id,
      },
      include: scheduleInclude,
    });

    await this.auditLogsService.createScheduleAuditLog({
      scheduleId: schedule.id,
      action: 'CANCEL',
      beforeData: existingSchedule,
      afterData: schedule,
      changedById: currentUser?.id,
    });
    await this.invalidateScheduleCache(existingSchedule.channelId);
    await this.enqueueScheduleJobs(schedule);

    return this.toResponse(schedule);
  }

  publish(id: string, currentUser?: RequestUser): Promise<PublishScheduleResponseDto> {
    return this.schedulePublishService.publish(id, currentUser);
  }

  private buildWhere(query: QuerySchedulesDto): Prisma.ScheduleWhereInput {
    const where: Prisma.ScheduleWhereInput = {};

    if (query.channelId) {
      where.channelId = query.channelId;
    }

    if (query.assetId) {
      where.assetId = query.assetId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const dateRange = query.date ? this.parseDateFilter(query.date) : undefined;
    const fromToRange = this.parseFromToFilter(query.from, query.to);
    const range = fromToRange ?? dateRange;

    if (range) {
      where.AND = [
        {
          startTime: {
            lt: range.to,
          },
        },
        {
          stopTime: {
            gt: range.from,
          },
        },
      ];
    }

    return where;
  }

  private async buildCreateInput(dto: CreateScheduleDto, asset: Asset | null) {
    this.scheduleValidationService.validateBaseScheduleInput(dto);

    const requestedStartTime = this.scheduleValidationService.parseDateTime(dto.startTime, 'startTime');
    const explicitStopTime = dto.stopTime
      ? this.scheduleValidationService.parseDateTime(dto.stopTime, 'stopTime')
      : undefined;
    const duration = this.scheduleValidationService.resolveDuration(
      {
        duration: dto.duration,
        startTime: requestedStartTime,
        stopTime: explicitStopTime,
      },
      asset,
    );
    const snappedTimeRange = dto.autoSnap
      ? await this.autoSnapService.resolveAutoSnap(dto.channelId, { startTime: requestedStartTime }, duration)
      : undefined;
    const startTime = snappedTimeRange?.startTime ?? requestedStartTime;
    const stopTime =
      snappedTimeRange?.stopTime ??
      explicitStopTime ??
      this.scheduleValidationService.calculateStopTime(startTime, duration);
    const name = dto.name ?? asset?.name;

    if (!name) {
      throw new NotFoundException('Schedule name is required when assetId is not provided');
    }

    this.scheduleValidationService.validateTimeRange(startTime, stopTime);
    this.scheduleValidationService.validateDurationMatchesRange(startTime, stopTime, duration);

    return {
      name,
      startTime,
      stopTime,
      duration,
    };
  }

  private validateStatusTransition(existingSchedule: Schedule, dto: UpdateScheduleDto): void {
    if (existingSchedule.status === ScheduleStatus.CANCELLED) {
      throw new BadRequestException('Cancelled schedule cannot be updated');
    }

    if (dto.status === ScheduleStatus.PUBLISHED && existingSchedule.status !== ScheduleStatus.PUBLISHED) {
      throw new BadRequestException('Use the publish endpoint to publish a schedule');
    }
  }

  private async buildUpdateInput(dto: UpdateScheduleDto, existingSchedule: Schedule) {
    const channelId = dto.channelId ?? existingSchedule.channelId;
    await this.assertChannelExists(channelId);

    const asset =
      dto.assetId !== undefined
        ? await this.findAssetById(dto.assetId)
        : existingSchedule.assetId
          ? await this.findAssetById(existingSchedule.assetId)
          : null;
    const startTime = dto.startTime
      ? this.scheduleValidationService.parseDateTime(dto.startTime, 'startTime')
      : existingSchedule.startTime;
    const explicitStopTime = dto.stopTime
      ? this.scheduleValidationService.parseDateTime(dto.stopTime, 'stopTime')
      : undefined;
    const duration = this.resolveUpdateDuration(dto, existingSchedule, startTime, explicitStopTime, asset);
    const stopTime =
      explicitStopTime ??
      (dto.startTime || dto.duration || dto.assetId !== undefined
        ? this.scheduleValidationService.calculateStopTime(startTime, duration)
        : existingSchedule.stopTime);
    const name = dto.name ?? (dto.assetId !== undefined && asset ? asset.name : undefined);

    this.scheduleValidationService.validateTimeRange(startTime, stopTime);
    this.scheduleValidationService.validateDurationMatchesRange(startTime, stopTime, duration);

    return {
      channelId,
      name,
      startTime,
      stopTime,
      duration,
      persistStartTime: dto.startTime !== undefined,
      persistStopTime: dto.stopTime !== undefined || dto.startTime !== undefined || dto.duration !== undefined || dto.assetId !== undefined,
      persistDuration: dto.duration !== undefined || dto.stopTime !== undefined || dto.assetId !== undefined,
    };
  }

  private resolveUpdateDuration(
    dto: UpdateScheduleDto,
    existingSchedule: Schedule,
    startTime: Date,
    explicitStopTime?: Date,
    asset?: Asset | null,
  ): number {
    if (dto.duration !== undefined) {
      this.scheduleValidationService.validateDuration(dto.duration);
      return dto.duration;
    }

    if (dto.assetId !== undefined && asset) {
      this.scheduleValidationService.validateDuration(asset.duration);
      return asset.duration;
    }

    if (explicitStopTime) {
      return this.scheduleValidationService.resolveDuration({ startTime, stopTime: explicitStopTime });
    }

    return existingSchedule.duration;
  }

  private parseDateFilter(date: string): { from: Date; to: Date } {
    const from = new Date(`${date}T00:00:00.000Z`);

    if (Number.isNaN(from.getTime())) {
      throw new BadRequestException('Invalid date filter');
    }

    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 1);

    return { from, to };
  }

  private parseFromToFilter(from?: string, to?: string): { from: Date; to: Date } | undefined {
    if (!from && !to) {
      return undefined;
    }

    const rangeFrom = from
      ? this.scheduleValidationService.parseDateTime(from, 'from')
      : new Date(0);
    const rangeTo = to
      ? this.scheduleValidationService.parseDateTime(to, 'to')
      : new Date('9999-12-31T23:59:59.999Z');

    this.scheduleValidationService.validateTimeRange(rangeFrom, rangeTo);

    return {
      from: rangeFrom,
      to: rangeTo,
    };
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

  private async findAssetById(assetId: string): Promise<Asset> {
    const asset = await this.prismaService.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  private async findRawScheduleById(id: string): Promise<Schedule> {
    const schedule = await this.prismaService.schedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  private async findScheduleById(id: string): Promise<ScheduleWithRelations> {
    const schedule = await this.prismaService.schedule.findUnique({
      where: { id },
      include: scheduleInclude,
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  private toJsonInput(metadata?: Record<string, unknown>): Prisma.InputJsonValue | undefined {
    return metadata as Prisma.InputJsonValue | undefined;
  }

  private async invalidateScheduleCache(channelId: string, previousChannelId?: string): Promise<void> {
    const channelIds = new Set(
      [channelId, previousChannelId].filter((value): value is string => Boolean(value)),
    );

    await Promise.all(
      [...channelIds].map((affectedChannelId) =>
        this.scheduleCacheService.invalidateChannel(affectedChannelId),
      ),
    );
  }

  private async enqueueScheduleJobs(
    schedule: ScheduleWithRelations,
    previousChannelId?: string,
  ): Promise<void> {
    try {
      const channelIds = new Set(
        [schedule.channelId, previousChannelId].filter((value): value is string => Boolean(value)),
      );

      await Promise.all(
        [...channelIds].flatMap((channelId) => [
          this.cacheInvalidationProducer.addInvalidateChannelScheduleJob(channelId),
          this.cacheInvalidationProducer.addInvalidatePublicSchedulesJob(channelId),
          this.cacheInvalidationProducer.addInvalidateTimelineJob(channelId),
          this.timelineSnapshotProducer.addGenerateTimelineSnapshotJob(
            channelId,
            schedule.startTime,
            schedule.stopTime,
          ),
        ]),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to enqueue schedule background jobs: ${message}`);
    }
  }

  private toResponse(schedule: ScheduleWithRelations): ScheduleResponseDto {
    return {
      id: schedule.id,
      name: schedule.name,
      channelId: schedule.channelId,
      assetId: schedule.assetId,
      startTime: schedule.startTime,
      stopTime: schedule.stopTime,
      duration: schedule.duration,
      status: schedule.status,
      version: schedule.version,
      metadata: schedule.metadata,
      createdById: schedule.createdById,
      updatedById: schedule.updatedById,
      publishedAt: schedule.publishedAt,
      channel: schedule.channel,
      asset: schedule.asset,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };
  }
}
