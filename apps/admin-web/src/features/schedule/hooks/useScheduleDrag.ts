import type { DragEndEvent, DragMoveEvent } from '@dnd-kit/core';
import dayjs from 'dayjs';
import type { Asset, Schedule } from '../types/schedule.type';
import { pxToTime, timeToPx } from '../utils/timeline-time.util';
import {
  applyScheduleSnap,
  hasOverlap,
} from '../utils/timeline-snap.util';

interface UseScheduleDragOptions {
  dayStart: Date;
  pixelsPerHour: number;
  schedules: Schedule[];
  onAssetDrop: (
    asset: Asset,
    channelId: string,
    startTime: Date,
    stopTime: Date,
    autoSnap: boolean,
  ) => Promise<void>;
  onScheduleMove: (
    schedule: Schedule,
    channelId: string,
    startTime: Date,
    stopTime: Date,
  ) => Promise<void>;
  onOverlapDetected: (nextSuggestedStart?: Date) => void;
  onPreviewChange?: (preview: TimelineDragPreview | null) => void;
}

interface AssetDragData {
  kind: 'asset';
  asset: Asset;
  dragAnchorOffsetX?: number;
}

interface ScheduleDragData {
  kind: 'schedule';
  schedule: Schedule;
}

type TimelineDragData = AssetDragData | ScheduleDragData;

export interface TimelineDragPreview {
  kind: 'asset' | 'schedule';
  channelId: string;
  startTime: Date;
  stopTime: Date;
  leftPx: number;
  widthPx: number;
  isOverlap: boolean;
}

export function useScheduleDrag({
  dayStart,
  pixelsPerHour,
  schedules,
  onAssetDrop,
  onScheduleMove,
  onOverlapDetected,
  onPreviewChange,
}: UseScheduleDragOptions) {
  const emitPreview = (preview: TimelineDragPreview | null) => {
    onPreviewChange?.(preview);
  };

  const buildPreview = (
    event:
      | Pick<DragMoveEvent, 'active' | 'over' | 'delta'>
      | Pick<DragEndEvent, 'active' | 'over' | 'delta'>,
  ): TimelineDragPreview | null => {
    if (!event.over) {
      return null;
    }

    const channelId = String(event.over.id).replace('channel:', '');
    const activeData = event.active.data.current as TimelineDragData | undefined;
    if (!activeData) {
      return null;
    }

    if (activeData.kind === 'asset') {
      const startTime = resolveDropTime(
        event,
        channelId,
        dayStart,
        pixelsPerHour,
        activeData.dragAnchorOffsetX,
      );
      const snapped = applyScheduleSnap({
        schedules,
        channelId,
        startTime,
        durationSeconds: activeData.asset.duration,
      });
      const overlap = hasOverlap(schedules, channelId, snapped.startTime, snapped.stopTime);

      return {
        kind: 'asset',
        channelId,
        startTime: snapped.startTime,
        stopTime: snapped.stopTime,
        leftPx: timeToPx(snapped.startTime, dayStart, pixelsPerHour),
        widthPx: Math.max(14, (activeData.asset.duration / 3600) * pixelsPerHour),
        isOverlap: overlap,
      };
    }

    const movedStart = resolveMovedScheduleStartTime(event as DragEndEvent, activeData.schedule.startTime, dayStart, pixelsPerHour);
    const snapped = applyScheduleSnap({
      schedules,
      channelId,
      startTime: movedStart,
      durationSeconds: activeData.schedule.duration,
      excludeId: activeData.schedule.id,
    });
    const overlap = hasOverlap(
      schedules,
      channelId,
      snapped.startTime,
      snapped.stopTime,
      activeData.schedule.id,
    );

    return {
      kind: 'schedule',
      channelId,
      startTime: snapped.startTime,
      stopTime: snapped.stopTime,
      leftPx: timeToPx(snapped.startTime, dayStart, pixelsPerHour),
      widthPx: Math.max(14, (activeData.schedule.duration / 3600) * pixelsPerHour),
      isOverlap: overlap,
    };
  };

  const handleDragMove = (event: DragMoveEvent) => {
    emitPreview(buildPreview(event));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const preview = buildPreview(event);
    emitPreview(null);

    if (!event.over) {
      return;
    }

    const channelId = String(event.over.id).replace('channel:', '');
    const activeData = event.active.data.current as TimelineDragData | undefined;

    if (!activeData) {
      return;
    }

    if (activeData.kind === 'asset') {
      const { asset } = activeData;
      const startTime = preview?.kind === 'asset'
        ? preview.startTime
        : resolveDropTime(
            event,
            channelId,
            dayStart,
            pixelsPerHour,
            activeData.dragAnchorOffsetX,
          );
      const snapped = applyScheduleSnap({
        schedules,
        channelId,
        startTime,
        durationSeconds: asset.duration,
      });

      if (hasOverlap(schedules, channelId, snapped.startTime, snapped.stopTime)) {
        onOverlapDetected(snapped.stopTime);
        return;
      }

      const autoSnap = snapped.snappedToPrevious || snapped.snappedToNext;
      await onAssetDrop(asset, channelId, snapped.startTime, snapped.stopTime, autoSnap);
      return;
    }

    if (activeData.kind === 'schedule') {
      const { schedule } = activeData;
      const startTime = preview?.kind === 'schedule'
        ? preview.startTime
        : resolveMovedScheduleStartTime(event, schedule.startTime, dayStart, pixelsPerHour);
      const snapped = applyScheduleSnap({
        schedules,
        channelId,
        startTime,
        durationSeconds: schedule.duration,
        excludeId: schedule.id,
      });

      if (hasOverlap(schedules, channelId, snapped.startTime, snapped.stopTime, schedule.id)) {
        onOverlapDetected(snapped.stopTime);
        return;
      }

      await onScheduleMove(schedule, channelId, snapped.startTime, snapped.stopTime);
    }
  };

  const handleDragCancel = () => {
    emitPreview(null);
  };

  return { handleDragMove, handleDragEnd, handleDragCancel };
}

// ── Private helpers ──────────────────────────────────────────────────────────

function resolveDropTime(
  event:
    | Pick<DragEndEvent, 'active'>
    | Pick<DragMoveEvent, 'active'>,
  channelId: string,
  dayStart: Date,
  pixelsPerHour: number,
  dragAnchorOffsetX?: number,
): Date {
  const row = document.querySelector<HTMLElement>(`[data-timeline-row="${channelId}"]`);
  const translatedRect = event.active.rect.current.translated ?? event.active.rect.current.initial;

  if (!row || !translatedRect) {
    return dayStart;
  }

  const rowRect = row.getBoundingClientRect();
  const anchorOffset = typeof dragAnchorOffsetX === 'number'
    ? dragAnchorOffsetX
    : translatedRect.width / 2;
  const offsetX = translatedRect.left + anchorOffset - rowRect.left;

  return pxToTime(offsetX, dayStart, pixelsPerHour);
}

function resolveMovedScheduleStartTime(
  event: Pick<DragEndEvent, 'delta' | 'over' | 'active'>,
  originalStartTimeIso: string,
  dayStart: Date,
  pixelsPerHour: number,
): Date {
  // Use drag delta for schedule moves: stable with horizontal scroll and
  // cross-day clipped blocks.
  if (typeof event.delta?.x === 'number' && Number.isFinite(event.delta.x)) {
    const deltaSeconds = (event.delta.x / pixelsPerHour) * 3600;
    const moved = dayjs(originalStartTimeIso).add(deltaSeconds, 'second').toDate();

    return moved;
  }

  // Fallback to absolute drop calculation.
  const channelId = String(event.over?.id ?? '').replace('channel:', '');
  return resolveDropTime(event, channelId, dayStart, pixelsPerHour);
}
