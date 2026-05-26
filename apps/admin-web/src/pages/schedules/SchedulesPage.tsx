import { useQuery } from '@tanstack/react-query';
import { Alert, Spin } from 'antd';
import dayjs from 'dayjs';
import { schedulesApi } from '../../features/schedule/api/schedules.api';
import { ScheduleTimeline } from '../../features/schedule/components/ScheduleTimeline';
import { useScheduleStore } from '../../features/schedule/stores/schedule.store';
import type { Asset, Channel, Schedule } from '../../features/schedule/types/schedule.type';

function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === 'object') {
    const data = (value as { data?: unknown }).data;

    if (Array.isArray(data)) {
      return data as T[];
    }

    if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
      return (data as { data: T[] }).data;
    }
  }

  return [];
}

export function SchedulesPage() {
  const selectedChannel = useScheduleStore((state) => state.selectedChannel);
  const selectedDate = useScheduleStore((state) => state.selectedDate);
  const refreshVersion = useScheduleStore((state) => state.refreshVersion);

  // ── Channels ──────────────────────────────────────────────────────────────
  // Fetched independently; never blocked by schedule errors.
  const channelsQuery = useQuery({
    queryKey: ['channels'],
    queryFn: schedulesApi.getChannels,
  });

  // ── Assets ────────────────────────────────────────────────────────────────
  // Fetched independently; never blocked by schedule errors.
  const assetsQuery = useQuery({
    queryKey: ['assets'],
    queryFn: () => schedulesApi.getAssets(),
  });

  // ── Schedules ─────────────────────────────────────────────────────────────
  // Only fires when a channel is selected. Uses from/to ISO range so the
  // backend never receives an invalid `date` param that causes a 400.
  const schedulesQuery = useQuery({
    queryKey: ['schedules', selectedChannel, selectedDate, refreshVersion],
    queryFn: () => {
      const from = dayjs(selectedDate).startOf('day').toISOString();
      // Extend to early next day so cross-midnight overlap checks are visible
      // to frontend pre-validation (e.g. 23:40 + 2h vs next-day 00:00 slot).
      const to = dayjs(selectedDate).add(1, 'day').startOf('day').add(6, 'hour').toISOString();

      return schedulesApi.getSchedules({
        channelId: selectedChannel || undefined,
        from,
        to,
      });
    },
  });

  const channels = ensureArray<Channel>(channelsQuery.data);
  const assets = ensureArray<Asset>(assetsQuery.data);
  const schedules = ensureArray<Schedule>(schedulesQuery.data);

  // Only block initial data loading (channels + assets). Schedules loading is
  // shown locally inside the timeline grid via schedulesLoading prop.
  const isInitialLoading = channelsQuery.isLoading || assetsQuery.isLoading;

  // Channel/asset errors block the whole layout — show a page-level alert.
  const dataLoadError = channelsQuery.error ?? assetsQuery.error ?? null;

  return (
    <section className="schedules-page ops-page">
      {dataLoadError ? (
        <Alert
          type="error"
          showIcon
          message="Failed to load channels or assets"
          description={
            dataLoadError instanceof Error
              ? dataLoadError.message
              : 'An unexpected error occurred. Please refresh the page.'
          }
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <Spin spinning={isInitialLoading} tip="Loading…">
        <ScheduleTimeline
          channels={channels}
          assets={assets}
          schedules={schedules}
          schedulesLoading={schedulesQuery.isFetching}
          schedulesError={schedulesQuery.error}
        />
      </Spin>
    </section>
  );
}
