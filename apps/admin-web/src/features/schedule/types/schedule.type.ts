export type AssetType = 'LIVE' | 'VOD';
export type ScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
export type WarningType = 'OVERLAP' | 'GAP' | 'GAP_BEFORE' | 'GAP_AFTER' | 'VALIDATION';

export interface Channel {
  id: string;
  name: string;
  epgId?: string | null;
  logoUrl?: string | null;
  isActive?: boolean;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  dashUrl?: string | null;
  hlsUrl?: string | null;
  duration: number;
  posterUrl?: string | null;
  thumbnailUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface Schedule {
  id: string;
  name: string;
  channelId: string;
  assetId?: string | null;
  startTime: string;
  stopTime: string;
  duration: number;
  status: ScheduleStatus;
  version: number;
  metadata?: Record<string, unknown> | null;
  publishedAt?: string | null;
  channel?: Pick<Channel, 'epgId' | 'id' | 'name'>;
  asset?: Pick<Asset, 'duration' | 'id' | 'name' | 'type'> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimelineWarning {
  type: WarningType;
  message: string;
  from?: string;
  to?: string;
  scheduleId?: string;
}

export interface PaginatedResponse<TItem> {
  data: TItem[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ScheduleMutationResponse {
  data: Schedule;
  warnings: TimelineWarning[];
}

export interface PublishScheduleResponse {
  success: boolean;
  message: string;
  data: Schedule;
}

export interface GetSchedulesParams {
  channelId?: string;
  assetId?: string;
  status?: ScheduleStatus;
  date?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CreateSchedulePayload {
  name?: string;
  channelId: string;
  assetId?: string;
  startTime: string;
  stopTime?: string;
  duration?: number;
  status?: ScheduleStatus;
  metadata?: Record<string, unknown>;
  autoSnap?: boolean;
}

export type UpdateSchedulePayload = Partial<CreateSchedulePayload>;

export interface TimelineRange {
  start: Date;
  end: Date;
}
