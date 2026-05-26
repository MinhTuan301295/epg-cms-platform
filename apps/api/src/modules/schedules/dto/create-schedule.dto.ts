import { ScheduleStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsISO8601, IsObject, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateScheduleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsUUID()
  channelId!: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsISO8601()
  startTime!: string;

  @IsOptional()
  @IsISO8601()
  stopTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  autoSnap?: boolean;
}
