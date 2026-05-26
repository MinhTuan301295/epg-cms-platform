import type { DragEndEvent } from '@dnd-kit/core';
import dayjs from 'dayjs';
import type { Asset, Schedule } from '../types/schedule.type';
import { pxToTime, snapTime } from '../utils/timeline-time.util';

interface UseScheduleDragOptions {
  dayStart: Date;
  pixelsPerHour: number;
  schedules: Schedule[];
  onAssetDrop: (asset: Asset, channelId: string, startTime: Date, autoSnap: boolean) => Promise<void>;
  onScheduleMove: (schedule: Schedule, channelId: string, startTime: Date) => Promise<void>;
}

interface AssetDragData {
  kind: 'asset';
  asset: Asset;
}

interface ScheduleDragData {
  kind: 'schedule';
  schedule: Schedule;
}

type TimelineDragData = AssetDragData | ScheduleDragData;

export function useScheduleDrag({
  dayStart,
  pixelsPerHour,
  schedules,
  onAssetDrop,
  onScheduleMove,
}: UseScheduleDragOptions) {
  const handleDragEnd = async (event: DragEndEvent) => {
    if (!event.over) {
      return;
    }

    const channelId = String(event.over.id).replace('channel:', '');
    const startTime = resolveDropTime(event, channelId, dayStart, pixelsPerHour);
    const activeData = event.active.data.current as TimelineDragData | undefined;

    if (!activeData) {
      return;
    }

    if (activeData.kind === 'asset') {
      await onAssetDrop(activeData.asset, channelId, startTime, shouldAutoSnap(schedules, channelId, startTime));
      return;
    }

    await onScheduleMove(activeData.schedule, channelId, startTime);
  };

  return {
    handleDragEnd,
  };
}

function resolveDropTime(
  event: DragEndEvent,
  channelId: string,
  dayStart: Date,
  pixelsPerHour: number,
): Date {
  const row = document.querySelector<HTMLElement>(`[data-timeline-row="${channelId}"]`);
  const scrollArea = row?.closest<HTMLElement>('.timeline-scroll');
  const translatedRect = event.active.rect.current.translated ?? event.active.rect.current.initial;

  if (!row || !translatedRect) {
    return dayStart;
  }

  const rowRect = row.getBoundingClientRect();
  const offsetX = translatedRect.left - rowRect.left + (scrollArea?.scrollLeft ?? 0);

  return snapTime(pxToTime(offsetX, dayStart, pixelsPerHour), 5);
}

function shouldAutoSnap(schedules: Schedule[], channelId: string, startTime: Date): boolean {
  const nearPreviousSchedule = schedules
    .filter((schedule) => schedule.channelId === channelId && schedule.status !== 'CANCELLED')
    .some((schedule) => Math.abs(dayjs(startTime).diff(schedule.stopTime, 'minute')) <= 10);

  return nearPreviousSchedule;
}
