import dayjs from 'dayjs';
import { apiClient } from './api-client';

interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaginatedResponse<TItem> {
  data: TItem[];
  meta: PaginatedMeta;
}

interface ChannelItem {
  id: string;
  name: string;
  isActive: boolean;
}

type ScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';

interface ScheduleItem {
  id: string;
  channelId: string;
  name: string;
  startTime: string;
  stopTime: string;
  status: ScheduleStatus;
}

interface QueueHealthItem {
  name: string;
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  paused: number;
}

interface ImporterQueueHealthResponse {
  generatedAt: string;
  importer: {
    importedToday: number;
    latestImportAt: string | null;
  };
  queues: QueueHealthItem[];
  recentImporterJobs: Array<{
    id: string;
    name: string;
    state: string;
    attemptsMade: number;
    timestamp: number;
    finishedOn: number | null;
    failedReason: string | null;
  }>;
}

interface ApiEndpointMetric {
  requests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRatio: number;
  p50Ms: number;
  p95Ms: number;
  latestMs: number;
}

interface ApiCacheMetricsResponse {
  generatedAt: string;
  api: {
    generatedAt: string;
    endpoints: {
      publicChannels: ApiEndpointMetric;
      publicSchedules: ApiEndpointMetric;
    };
  };
  cacheKeys: {
    publicSchedules: number;
    publicChannels: number;
    timeline: number;
    total: number;
  };
}

interface ChannelIssue {
  channelId: string;
  channelName: string;
  overlaps: number;
  gaps: number;
  invalidRanges: number;
}

export interface DashboardSnapshot {
  generatedAt: string;
  totals: {
    channels: number;
    assets: number;
  };
  onAirHealth: {
    activeChannels: number;
    onAirChannels: number;
    channelsWithoutOnAir: number;
    channelsWithoutNext6hCoverage: number;
  };
  channelHealth: {
    onAirChannelIds: string[];
    next6hCoverageChannelIds: string[];
  };
  scheduleIntegrity: {
    overlaps: number;
    gaps: number;
    invalidRanges: number;
    channelsWithIssues: number;
    topRiskChannels: ChannelIssue[];
  };
  publishPipeline: {
    draft: number;
    published: number;
    cancelled: number;
  };
  importerQueueHealth: {
    generatedAt: string | null;
    importedToday: number;
    latestImportAt: string | null;
    failedJobs: number;
    queuedJobs: number;
    activeJobs: number;
    queueItems: QueueHealthItem[];
    recentImporterJobs: ImporterQueueHealthResponse['recentImporterJobs'];
    hasError: boolean;
  };
  apiCacheMetrics: {
    generatedAt: string | null;
    publicSchedules: ApiEndpointMetric;
    publicChannels: ApiEndpointMetric;
    cacheKeys: ApiCacheMetricsResponse['cacheKeys'];
    hasError: boolean;
  };
}

const pageLimit = 100;
const maxPageCount = 50;

async function fetchPage<TItem>(
  endpoint: string,
  page: number,
  params: Record<string, unknown> = {},
): Promise<PaginatedResponse<TItem>> {
  const response = await apiClient.get<PaginatedResponse<TItem>>(endpoint, {
    params: {
      ...params,
      page,
      limit: pageLimit,
    },
  });

  return response.data;
}

async function fetchAllPages<TItem>(
  endpoint: string,
  params: Record<string, unknown> = {},
): Promise<TItem[]> {
  const firstPage = await fetchPage<TItem>(endpoint, 1, params);
  const result = [...firstPage.data];
  const totalPages = Math.min(firstPage.meta?.totalPages ?? 1, maxPageCount);

  if (totalPages <= 1) {
    return result;
  }

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await fetchPage<TItem>(endpoint, page, params);
    result.push(...nextPage.data);
  }

  return result;
}

function countByStatus(schedules: ScheduleItem[], status: ScheduleStatus): number {
  return schedules.filter((schedule) => schedule.status === status).length;
}

function calculateIntegrity(
  schedules: ScheduleItem[],
  channelsById: Map<string, ChannelItem>,
): DashboardSnapshot['scheduleIntegrity'] {
  const nonCancelled = schedules.filter((schedule) => schedule.status !== 'CANCELLED');
  const grouped = new Map<string, ScheduleItem[]>();

  for (const schedule of nonCancelled) {
    const channelSchedules = grouped.get(schedule.channelId);

    if (channelSchedules) {
      channelSchedules.push(schedule);
    } else {
      grouped.set(schedule.channelId, [schedule]);
    }
  }

  let overlaps = 0;
  let gaps = 0;
  let invalidRanges = 0;
  const channelIssueMap = new Map<string, ChannelIssue>();

  const getIssue = (channelId: string): ChannelIssue => {
    const existing = channelIssueMap.get(channelId);
    if (existing) {
      return existing;
    }

    const channel = channelsById.get(channelId);
    const next: ChannelIssue = {
      channelId,
      channelName: channel?.name ?? channelId,
      overlaps: 0,
      gaps: 0,
      invalidRanges: 0,
    };
    channelIssueMap.set(channelId, next);
    return next;
  };

  for (const [channelId, channelSchedules] of grouped.entries()) {
    channelSchedules.sort(
      (left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime(),
    );

    let previousEnd: Date | null = null;

    for (const schedule of channelSchedules) {
      const start = new Date(schedule.startTime);
      const stop = new Date(schedule.stopTime);

      if (Number.isNaN(start.getTime()) || Number.isNaN(stop.getTime()) || stop <= start) {
        invalidRanges += 1;
        getIssue(channelId).invalidRanges += 1;
        continue;
      }

      if (previousEnd) {
        if (start < previousEnd) {
          overlaps += 1;
          getIssue(channelId).overlaps += 1;
        } else if (start > previousEnd) {
          gaps += 1;
          getIssue(channelId).gaps += 1;
        }
      }

      if (!previousEnd || stop > previousEnd) {
        previousEnd = stop;
      }
    }
  }

  const topRiskChannels = [...channelIssueMap.values()]
    .filter((issue) => issue.overlaps > 0 || issue.gaps > 0 || issue.invalidRanges > 0)
    .sort((left, right) => {
      const leftScore = left.overlaps * 3 + left.gaps * 2 + left.invalidRanges * 3;
      const rightScore = right.overlaps * 3 + right.gaps * 2 + right.invalidRanges * 3;
      return rightScore - leftScore;
    })
    .slice(0, 5);

  return {
    overlaps,
    gaps,
    invalidRanges,
    channelsWithIssues: topRiskChannels.length,
    topRiskChannels,
  };
}

export const dashboardService = {
  async getSnapshot(): Promise<DashboardSnapshot> {
    const now = dayjs();
    const startOfDay = now.startOf('day').toISOString();
    const endOfDay = now.endOf('day').toISOString();
    const nowIso = now.toISOString();
    const nextSecondIso = now.add(1, 'second').toISOString();
    const next6hIso = now.add(6, 'hour').toISOString();

    const [
      activeChannels,
      allChannels,
      schedulesToday,
      schedulesOnAir,
      schedulesNext6h,
      assetsMeta,
      importerQueueHealthResult,
      apiCacheMetricsResult,
    ] = await Promise.all([
      fetchAllPages<ChannelItem>('/channels', { isActive: true }),
      fetchAllPages<ChannelItem>('/channels'),
      fetchAllPages<ScheduleItem>('/schedules', { from: startOfDay, to: endOfDay }),
      fetchAllPages<ScheduleItem>('/schedules', { from: nowIso, to: nextSecondIso }),
      fetchAllPages<ScheduleItem>('/schedules', { from: nowIso, to: next6hIso }),
      apiClient.get<PaginatedResponse<unknown>>('/assets', {
        params: { page: 1, limit: 1 },
      }),
      apiClient
        .get<ImporterQueueHealthResponse>('/operations/importer-queue-health')
        .then((response) => response.data)
        .catch(() => null),
      apiClient
        .get<ApiCacheMetricsResponse>('/operations/api-cache-metrics')
        .then((response) => response.data)
        .catch(() => null),
    ]);

    const activeChannelIds = new Set(activeChannels.map((channel) => channel.id));

    const onAirChannelIds = new Set(
      schedulesOnAir
        .filter((schedule) => schedule.status !== 'CANCELLED' && activeChannelIds.has(schedule.channelId))
        .map((schedule) => schedule.channelId),
    );

    const next6hCoverageChannelIds = new Set(
      schedulesNext6h
        .filter((schedule) => schedule.status !== 'CANCELLED' && activeChannelIds.has(schedule.channelId))
        .map((schedule) => schedule.channelId),
    );

    const channelsById = new Map(allChannels.map((channel) => [channel.id, channel]));
    const integrity = calculateIntegrity(schedulesToday, channelsById);

    const importerQueueHealth = importerQueueHealthResult
      ? {
          generatedAt: importerQueueHealthResult.generatedAt,
          importedToday: importerQueueHealthResult.importer.importedToday,
          latestImportAt: importerQueueHealthResult.importer.latestImportAt,
          failedJobs: importerQueueHealthResult.queues.reduce((total, item) => total + item.failed, 0),
          queuedJobs: importerQueueHealthResult.queues.reduce(
            (total, item) => total + item.waiting + item.delayed,
            0,
          ),
          activeJobs: importerQueueHealthResult.queues.reduce((total, item) => total + item.active, 0),
          queueItems: importerQueueHealthResult.queues,
          recentImporterJobs: importerQueueHealthResult.recentImporterJobs,
          hasError: false,
        }
      : {
          generatedAt: null,
          importedToday: 0,
          latestImportAt: null,
          failedJobs: 0,
          queuedJobs: 0,
          activeJobs: 0,
          queueItems: [],
          recentImporterJobs: [],
          hasError: true,
        };

    const zeroEndpointMetric: ApiEndpointMetric = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRatio: 0,
      p50Ms: 0,
      p95Ms: 0,
      latestMs: 0,
    };

    const apiCacheMetrics = apiCacheMetricsResult
      ? {
          generatedAt: apiCacheMetricsResult.generatedAt,
          publicSchedules: apiCacheMetricsResult.api.endpoints.publicSchedules,
          publicChannels: apiCacheMetricsResult.api.endpoints.publicChannels,
          cacheKeys: apiCacheMetricsResult.cacheKeys,
          hasError: false,
        }
      : {
          generatedAt: null,
          publicSchedules: zeroEndpointMetric,
          publicChannels: zeroEndpointMetric,
          cacheKeys: {
            publicSchedules: 0,
            publicChannels: 0,
            timeline: 0,
            total: 0,
          },
          hasError: true,
        };

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        channels: allChannels.length,
        assets: assetsMeta.data.meta?.total ?? 0,
      },
      onAirHealth: {
        activeChannels: activeChannels.length,
        onAirChannels: onAirChannelIds.size,
        channelsWithoutOnAir: Math.max(activeChannels.length - onAirChannelIds.size, 0),
        channelsWithoutNext6hCoverage: Math.max(activeChannels.length - next6hCoverageChannelIds.size, 0),
      },
      channelHealth: {
        onAirChannelIds: [...onAirChannelIds],
        next6hCoverageChannelIds: [...next6hCoverageChannelIds],
      },
      scheduleIntegrity: integrity,
      publishPipeline: {
        draft: countByStatus(schedulesToday, 'DRAFT'),
        published: countByStatus(schedulesToday, 'PUBLISHED'),
        cancelled: countByStatus(schedulesToday, 'CANCELLED'),
      },
      importerQueueHealth,
      apiCacheMetrics,
    };
  },
};
