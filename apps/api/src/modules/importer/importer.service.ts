import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ScheduleStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user.type';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ScheduleCacheService } from '../schedules/cache/schedule-cache.service';
import { ImporterProducer } from '../../queues/producers/importer.producer';
import { TimelineSnapshotProducer } from '../../queues/producers/timeline-snapshot.producer';
import type { ImportApplyDto } from './dto/import-apply.dto';
import type { ImportCsvDto } from './dto/import-csv.dto';
import type { ImportExternalApiDto } from './dto/import-external-api.dto';
import type { ImportXmltvDto } from './dto/import-xmltv.dto';
import { EpgChannelMapper } from './mappers/epg-channel.mapper';
import { ScheduleMapper } from './mappers/schedule.mapper';
import { CsvParser } from './parsers/csv.parser';
import { ExternalApiParser } from './parsers/external-api.parser';
import { XmltvParser } from './parsers/xmltv.parser';
import type {
  ImportApplyResult,
  ImportPreviewResult,
  ParsedProgram,
  ScheduleImportCandidate,
} from './types/importer.types';
import { ImportConflictValidator } from './validators/import-conflict.validator';

@Injectable()
export class ImporterService {
  private readonly logger = new Logger(ImporterService.name);
  private readonly jobStatus = new Map<string, { id: string; status: string; payload?: unknown }>();

  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
    @Inject(AuditLogsService) private readonly auditLogsService: AuditLogsService,
    @Inject(ScheduleCacheService) private readonly scheduleCacheService: ScheduleCacheService,
    @Inject(ImporterProducer) private readonly importerProducer: ImporterProducer,
    @Inject(TimelineSnapshotProducer) private readonly timelineSnapshotProducer: TimelineSnapshotProducer,
    @Inject(XmltvParser) private readonly xmltvParser: XmltvParser,
    @Inject(CsvParser) private readonly csvParser: CsvParser,
    @Inject(ExternalApiParser) private readonly externalApiParser: ExternalApiParser,
    @Inject(EpgChannelMapper) private readonly epgChannelMapper: EpgChannelMapper,
    @Inject(ScheduleMapper) private readonly scheduleMapper: ScheduleMapper,
    @Inject(ImportConflictValidator) private readonly conflictValidator: ImportConflictValidator,
  ) {}

  async previewXmltv(dto: ImportXmltvDto): Promise<ImportPreviewResult> {
    const content = dto.xmlContent ?? (dto.sourceUrl ? await this.fetchText(dto.sourceUrl) : undefined);

    if (!content) {
      throw new BadRequestException('xmlContent or sourceUrl is required');
    }

    const parsed = this.xmltvParser.parse(content);
    await this.enqueueImporterJob('XMLTV', { sourceUrl: dto.sourceUrl });

    return this.buildPreview(parsed.programs);
  }

  async previewCsv(dto: ImportCsvDto): Promise<ImportPreviewResult> {
    const content = dto.csvContent ?? (dto.sourceUrl ? await this.fetchText(dto.sourceUrl) : undefined);

    if (!content) {
      throw new BadRequestException('csvContent or sourceUrl is required');
    }

    const programs = this.csvParser.parse(content);
    await this.enqueueImporterJob('CSV', { sourceUrl: dto.sourceUrl });

    return this.buildPreview(programs);
  }

  async previewExternalApi(dto: ImportExternalApiDto): Promise<ImportPreviewResult> {
    const payload = await this.fetchJson(dto.url, dto.headers);
    const programs = this.externalApiParser.parse(payload, dto.sourceName).filter((program) => {
      const from = dto.from ? new Date(dto.from) : undefined;
      const to = dto.to ? new Date(dto.to) : undefined;

      return (!from || program.stopTime > from) && (!to || program.startTime < to);
    });

    await this.enqueueImporterJob('EXTERNAL_API', { sourceName: dto.sourceName, sourceUrl: dto.url });

    return this.buildPreview(programs);
  }

  async applyImport(dto: ImportApplyDto, currentUser?: RequestUser): Promise<ImportApplyResult> {
    if (dto.mode !== 'CREATE_ONLY') {
      throw new BadRequestException(`${dto.mode} is prepared but not implemented in this phase`);
    }

    const validCandidates = dto.candidates.filter((candidate) => candidate.channelId);
    const conflicts = await this.conflictValidator.detectConflicts(validCandidates);
    const conflictKeys = new Set(conflicts.map((conflict) => this.getCandidateKey(conflict.candidate)));
    const schedules = [];

    for (const candidate of validCandidates) {
      if (conflictKeys.has(this.getCandidateKey(candidate))) {
        continue;
      }

      const schedule = await this.prismaService.schedule.create({
        data: {
          name: candidate.title,
          channelId: candidate.channelId as string,
          assetId: candidate.assetId,
          startTime: new Date(candidate.startTime),
          stopTime: new Date(candidate.stopTime),
          duration: candidate.duration,
          status: ScheduleStatus.DRAFT,
          version: 1,
          metadata: this.toJsonInput({
            ...candidate.metadata,
            imported: true,
            externalChannelId: candidate.externalChannelId,
            description: candidate.description,
            assetName: candidate.assetName,
          }),
          createdById: currentUser?.id,
        },
      });

      await this.auditLogsService.createScheduleAuditLog({
        scheduleId: schedule.id,
        action: 'IMPORT_CREATE',
        beforeData: null,
        afterData: schedule,
        changedById: currentUser?.id,
      });
      schedules.push(schedule);
    }

    await this.invalidateAndEnqueue(validCandidates);

    return {
      created: schedules.length,
      skipped: dto.candidates.length - schedules.length,
      conflicts,
      schedules,
    };
  }

  getJob(id: string) {
    return this.getImporterJob(id);
  }

  private async getImporterJob(id: string) {
    const queuedJob = await this.importerProducer.getImporterJob(id);

    if (queuedJob) {
      return {
        id: String(queuedJob.id),
        name: queuedJob.name,
        status: await queuedJob.getState(),
        attemptsMade: queuedJob.attemptsMade,
        data: queuedJob.data,
      };
    }

    const job = this.jobStatus.get(id);

    if (!job) {
      throw new NotFoundException('Importer job not found');
    }

    return job;
  }

  private async buildPreview(programs: ParsedProgram[]): Promise<ImportPreviewResult> {
    const channelMap = await this.epgChannelMapper.getChannelMap(
      programs.map((program) => program.externalChannelId),
    );
    const { candidates, unmapped } = this.scheduleMapper.toCandidates(programs, channelMap);
    const conflicts = await this.conflictValidator.detectConflicts(candidates);
    const conflictKeys = new Set(conflicts.map((conflict) => this.getCandidateKey(conflict.candidate)));

    return {
      summary: {
        totalPrograms: programs.length,
        mappedPrograms: candidates.length,
        unmappedPrograms: unmapped.length,
        conflicts: conflicts.length,
        readyToImport: candidates.filter((candidate) => !conflictKeys.has(this.getCandidateKey(candidate))).length,
      },
      candidates,
      unmapped,
      conflicts,
      warnings: unmapped.map((item) => ({
        type: 'UNMAPPED_CHANNEL',
        message: item.reason,
        externalChannelId: item.externalChannelId,
      })),
    };
  }

  private async fetchText(url: string): Promise<string> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new BadRequestException(`Unable to fetch sourceUrl: ${response.status}`);
    }

    return response.text();
  }

  private async fetchJson(url: string, headers?: Record<string, string>): Promise<unknown> {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new BadRequestException(`Unable to fetch external API: ${response.status}`);
    }

    return response.json();
  }

  private async invalidateAndEnqueue(candidates: ScheduleImportCandidate[]): Promise<void> {
    const channelIds = [...new Set(candidates.map((candidate) => candidate.channelId).filter(Boolean))] as string[];

    try {
      await Promise.all(channelIds.map((channelId) => this.scheduleCacheService.invalidateChannel(channelId)));
      await Promise.all(
        candidates
          .filter((candidate) => candidate.channelId)
          .map((candidate) =>
            this.timelineSnapshotProducer.addGenerateTimelineSnapshotJob(
              candidate.channelId as string,
              candidate.startTime,
              candidate.stopTime,
            ),
          ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Importer cache invalidation or queue dispatch failed: ${message}`);
    }
  }

  private async enqueueImporterJob(type: 'CSV' | 'EXTERNAL_API' | 'XMLTV', payload: { sourceName?: string; sourceUrl?: string }) {
    try {
      const job = await this.importerProducer.addImporterJob({
        type,
        sourceName: payload.sourceName,
        sourceUrl: payload.sourceUrl,
      });
      this.jobStatus.set(String(job.id), {
        id: String(job.id),
        status: 'QUEUED',
        payload: job.data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Importer queue dispatch failed: ${message}`);
    }
  }

  private getCandidateKey(candidate: ScheduleImportCandidate): string {
    return `${candidate.channelId}:${candidate.startTime}:${candidate.stopTime}:${candidate.title}`;
  }

  private toJsonInput(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
