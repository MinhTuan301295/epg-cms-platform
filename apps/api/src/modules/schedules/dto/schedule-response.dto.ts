import type { AssetType, Prisma, ScheduleStatus } from '@prisma/client';

export class ScheduleChannelResponseDto {
  id!: string;
  name!: string;
  epgId!: string | null;
}

export class ScheduleAssetResponseDto {
  id!: string;
  name!: string;
  type!: AssetType;
  duration!: number;
}

export class ScheduleResponseDto {
  id!: string;
  name!: string;
  channelId!: string;
  assetId!: string | null;
  startTime!: Date;
  stopTime!: Date;
  duration!: number;
  status!: ScheduleStatus;
  version!: number;
  metadata!: Prisma.JsonValue | null;
  createdById!: string | null;
  updatedById!: string | null;
  publishedAt!: Date | null;
  channel!: ScheduleChannelResponseDto;
  asset!: ScheduleAssetResponseDto | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class SchedulesListResponseDto {
  data!: ScheduleResponseDto[];
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ScheduleWarningDto {
  type!: 'GAP_BEFORE' | 'GAP_AFTER';
  message!: string;
  from!: Date;
  to!: Date;
}

export class ScheduleMutationResponseDto {
  data!: ScheduleResponseDto;
  warnings!: ScheduleWarningDto[];
}
