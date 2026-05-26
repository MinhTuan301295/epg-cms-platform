import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsObject, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import type { ImportApplyMode } from '../types/importer.types';

export class ScheduleImportCandidateDto {
  @IsString()
  externalChannelId!: string;

  @IsOptional()
  @IsUUID()
  channelId?: string;

  @IsOptional()
  @IsString()
  channelName?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsISO8601()
  startTime!: string;

  @IsISO8601()
  stopTime!: string;

  @IsInt()
  @Min(1)
  duration!: number;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsString()
  assetName?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ImportApplyDto {
  @ValidateNested({ each: true })
  @Type(() => ScheduleImportCandidateDto)
  candidates!: ScheduleImportCandidateDto[];

  @IsIn(['CREATE_ONLY', 'UPSERT_BY_CHANNEL_TIME', 'REPLACE_RANGE'])
  mode!: ImportApplyMode;
}
