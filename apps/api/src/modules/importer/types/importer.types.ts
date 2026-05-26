export type ImportApplyMode = 'CREATE_ONLY' | 'REPLACE_RANGE' | 'UPSERT_BY_CHANNEL_TIME';
export type ImportSourceType = 'CSV' | 'EXTERNAL_API' | 'XMLTV';

export interface ParsedChannel {
  externalChannelId: string;
  displayName?: string;
}

export interface ParsedProgram {
  externalChannelId: string;
  title: string;
  description?: string;
  startTime: Date;
  stopTime: Date;
  duration?: number;
  assetId?: string;
  assetName?: string;
  metadata?: Record<string, unknown>;
}

export interface ScheduleImportCandidate {
  externalChannelId: string;
  channelId?: string;
  channelName?: string;
  title: string;
  description?: string;
  startTime: string;
  stopTime: string;
  duration: number;
  assetId?: string;
  assetName?: string;
  metadata?: Record<string, unknown>;
}

export interface UnmappedProgram {
  externalChannelId: string;
  title: string;
  startTime: string;
  stopTime: string;
  reason: string;
}

export interface ImportConflict {
  type: 'OVERLAP';
  channelId: string;
  candidate: ScheduleImportCandidate;
  existingSchedule: {
    id: string;
    name: string;
    startTime: Date;
    stopTime: Date;
    status: string;
  };
}

export interface ImportWarning {
  type: 'INVALID_PROGRAM' | 'UNMAPPED_CHANNEL' | 'VALIDATION';
  message: string;
  externalChannelId?: string;
}

export interface ImportPreviewResult {
  summary: {
    totalPrograms: number;
    mappedPrograms: number;
    unmappedPrograms: number;
    conflicts: number;
    readyToImport: number;
  };
  candidates: ScheduleImportCandidate[];
  unmapped: UnmappedProgram[];
  conflicts: ImportConflict[];
  warnings: ImportWarning[];
}

export interface ImportApplyResult {
  created: number;
  skipped: number;
  conflicts: ImportConflict[];
  schedules: unknown[];
}
