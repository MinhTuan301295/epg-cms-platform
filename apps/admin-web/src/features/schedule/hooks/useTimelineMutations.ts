import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App as AntdApp } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { schedulesApi } from '../api/schedules.api';
import { useScheduleStore } from '../stores/schedule.store';
import type { TimelineWarning, UpdateSchedulePayload } from '../types/schedule.type';

export function useTimelineMutations() {
  const { message } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const setWarnings = useScheduleStore((state) => state.setWarnings);
  const [publishingChannel, setPublishingChannel] = useState(false);

  const invalidateTimeline = async () => {
    await queryClient.invalidateQueries({ queryKey: ['schedules'] });
  };

  const createScheduleMutation = useMutation({
    mutationFn: schedulesApi.createSchedule,
    onSuccess: async (response) => {
      setWarnings(response.warnings);
      await invalidateTimeline();
    },
    onError: (error) => {
      const warning = toWarning(error);
      setWarnings([warning]);
      message.error(warning.message || 'Schedule could not be created');
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
      const warning = toWarning(error);
      setWarnings([warning]);
      message.error(warning.message || 'Schedule could not be updated');
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: schedulesApi.deleteSchedule,
    onSuccess: async () => {
      await invalidateTimeline();
    },
  });

  const publishScheduleMutation = useMutation({
    mutationFn: schedulesApi.publishSchedule,
    onSuccess: async () => {
      await invalidateTimeline();
    },
    onError: (error) => {
      const warning = toWarning(error);
      setWarnings([warning]);
      message.error(warning.message || 'Schedule could not be published');
    },
  });

  const publishSchedulesByChannel = async (scheduleIds: string[]) => {
    if (scheduleIds.length === 0) {
      return {
        published: 0,
        failed: 0,
      };
    }

    setPublishingChannel(true);

    let published = 0;
    let failed = 0;
    let firstError: unknown;

    try {
      for (const scheduleId of scheduleIds) {
        try {
          await schedulesApi.publishSchedule(scheduleId);
          published += 1;
        } catch (error) {
          failed += 1;
          firstError ??= error;
        }
      }

      await invalidateTimeline();

      if (failed > 0 && firstError) {
        setWarnings([toWarning(firstError)]);
      }

      return { published, failed };
    } finally {
      setPublishingChannel(false);
    }
  };

  return {
    createSchedule: createScheduleMutation.mutateAsync,
    updateSchedule: updateScheduleMutation.mutateAsync,
    deleteSchedule: deleteScheduleMutation.mutateAsync,
    deleting: deleteScheduleMutation.isPending,
    publishSchedule: publishScheduleMutation.mutateAsync,
    publishing: publishScheduleMutation.isPending,
    publishSchedulesByChannel,
    publishingChannel,
  };
}

function toWarning(error: unknown): TimelineWarning {
  if (isApiError(error)) {
    type ExistingSchedule = {
      id: string;
      name: string;
      startTime: string;
      stopTime: string;
    };
    const responseMessage = error.response?.data?.message;
    const nestedMessage =
      responseMessage && typeof responseMessage === 'object'
        ? (responseMessage as { message?: unknown }).message
        : undefined;
    const existingSchedule: ExistingSchedule | undefined =
      error.response?.data?.existingSchedule
      ?? (responseMessage && typeof responseMessage === 'object'
        ? (responseMessage as { existingSchedule?: ExistingSchedule }).existingSchedule
        : undefined);

    const flatMessage = Array.isArray(responseMessage)
      ? responseMessage.join(', ')
      : typeof responseMessage === 'string'
        ? responseMessage
        : undefined;
    const nestedMessageText = Array.isArray(nestedMessage)
      ? nestedMessage.join(', ')
      : typeof nestedMessage === 'string'
        ? nestedMessage
        : undefined;
    const messageText = nestedMessageText ?? flatMessage;
    const overlapMessage = existingSchedule
      ? `Overlap with "${existingSchedule.name}" (${dayjs(existingSchedule.startTime).format('YYYY-MM-DD HH:mm')} - ${dayjs(existingSchedule.stopTime).format('YYYY-MM-DD HH:mm')})`
      : undefined;
    const finalMessage = overlapMessage ?? messageText ?? 'Schedule validation failed.';

    return {
      type:
        messageText?.toLowerCase().includes('overlap') || Boolean(existingSchedule)
          ? 'OVERLAP'
          : 'VALIDATION',
      message: finalMessage,
      from: existingSchedule?.startTime,
      to: existingSchedule?.stopTime,
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
      existingSchedule?: {
        id: string;
        name: string;
        startTime: string;
        stopTime: string;
      };
    };
  };
}

function isApiError(error: unknown): error is ApiError {
  return Boolean(error && typeof error === 'object' && 'response' in error);
}
