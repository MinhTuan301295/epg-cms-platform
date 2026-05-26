import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntdApp } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { schedulesApi } from '../api/schedules.api';
import { useScheduleStore } from '../stores/schedule.store';
import type {
  CreateSchedulePayload,
  TimelineWarning,
  UpdateSchedulePayload,
} from '../types/schedule.type';
import { findGaps, findOverlaps } from '../utils/timeline.util';

export function useTimeline() {
  const { message } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const selectedChannel = useScheduleStore((state) => state.selectedChannel);
  const selectedDate = useScheduleStore((state) => state.selectedDate);
  const refreshVersion = useScheduleStore((state) => state.refreshVersion);
  const setSchedules = useScheduleStore((state) => state.setSchedules);
  const setWarnings = useScheduleStore((state) => state.setWarnings);
  const setLoading = useScheduleStore((state) => state.setLoading);
  const ensureChannel = useScheduleStore((state) => state.ensureChannel);

  const channelsQuery = useQuery({
    queryKey: ['timeline', 'channels'],
    queryFn: schedulesApi.getChannels,
  });

  const assetsQuery = useQuery({
    queryKey: ['timeline', 'assets'],
    queryFn: () => schedulesApi.getAssets(),
  });

  const schedulesQuery = useQuery({
    queryKey: ['timeline', 'schedules', selectedChannel, selectedDate, refreshVersion],
    enabled: Boolean(selectedChannel),
    queryFn: () =>
      schedulesApi.getSchedules({
        channelId: selectedChannel,
        date: selectedDate,
      }),
  });

  useEffect(() => {
    if (channelsQuery.data) {
      ensureChannel(channelsQuery.data);
    }
  }, [channelsQuery.data, ensureChannel]);

  useEffect(() => {
    const loading = channelsQuery.isLoading || assetsQuery.isLoading || schedulesQuery.isFetching;
    setLoading(loading);
  }, [assetsQuery.isLoading, channelsQuery.isLoading, schedulesQuery.isFetching, setLoading]);

  useEffect(() => {
    if (!schedulesQuery.data) {
      return;
    }

    setSchedules(schedulesQuery.data);
    setWarnings([...findOverlaps(schedulesQuery.data), ...findGaps(schedulesQuery.data)]);
  }, [schedulesQuery.data, setSchedules, setWarnings]);

  const invalidateTimeline = async () => {
    await queryClient.invalidateQueries({ queryKey: ['timeline', 'schedules'] });
  };

  const createScheduleMutation = useMutation({
    mutationFn: schedulesApi.createSchedule,
    onSuccess: async (response) => {
      setWarnings(response.warnings);
      await invalidateTimeline();
    },
    onError: (error) => {
      setWarnings([toWarning(error)]);
      message.error('Schedule could not be created');
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSchedulePayload }) =>
      schedulesApi.updateSchedule(id, payload),
    onSuccess: async (response) => {
      setWarnings(response.warnings);
      await invalidateTimeline();
    },
    onError: (error) => {
      setWarnings([toWarning(error)]);
      message.error('Schedule could not be updated');
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: schedulesApi.deleteSchedule,
    onSuccess: async () => {
      await invalidateTimeline();
    },
  });

  return {
    channels: channelsQuery.data ?? [],
    assets: assetsQuery.data ?? [],
    schedules: schedulesQuery.data ?? [],
    selectedChannel,
    selectedDate,
    isLoading: channelsQuery.isLoading || assetsQuery.isLoading || schedulesQuery.isFetching,
    refetch: schedulesQuery.refetch,
    createSchedule: createScheduleMutation.mutateAsync,
    updateSchedule: updateScheduleMutation.mutateAsync,
    deleteSchedule: deleteScheduleMutation.mutateAsync,
    buildCreatePayload,
  };
}

function buildCreatePayload(
  basePayload: Omit<CreateSchedulePayload, 'status'>,
): CreateSchedulePayload {
  return {
    ...basePayload,
    status: 'DRAFT',
  };
}

function toWarning(error: unknown): TimelineWarning {
  if (isApiError(error)) {
    const responseMessage = error.response?.data?.message;
    const messageText = Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage;

    return {
      type: messageText?.toLowerCase().includes('overlap') ? 'OVERLAP' : 'VALIDATION',
      message: messageText || 'Schedule validation failed.',
    };
  }

  return {
    type: 'VALIDATION',
    message: 'Schedule validation failed.',
  };
}

interface ApiError {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
}

function isApiError(error: unknown): error is ApiError {
  return Boolean(error && typeof error === 'object' && 'response' in error);
}

export function getIsoStartForDate(date: string): string {
  return dayjs(date).startOf('day').toISOString();
}
