import { useCallback } from 'react';
import type { Schedule } from '../types/schedule.type';
import { hasOverlap } from '../utils/timeline-snap.util';
import { applyResizeEdgeSnap, widthToDuration } from '../utils/schedule-position.util';

interface UseScheduleResizeOptions {
  pixelsPerHour: number;
  schedules: Schedule[];
  onResizeEnd: (schedule: Schedule, durationSeconds: number, stopTime: Date) => Promise<void>;
  onOverlapDetected: () => void;
}

export function useScheduleResize({
  pixelsPerHour,
  schedules,
  onResizeEnd,
  onOverlapDetected,
}: UseScheduleResizeOptions) {
  const startResize = useCallback(
    (schedule: Schedule, initialWidth: number, event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;

      const handlePointerUp = async (pointerEvent: PointerEvent) => {
        document.removeEventListener('pointerup', handlePointerUp);

        const rawWidth = initialWidth + pointerEvent.clientX - startX;
        // widthToDuration already snaps to 5-minute grid
        const rawDuration = widthToDuration(rawWidth, pixelsPerHour);
        const scheduleStart = new Date(schedule.startTime);

        // Apply edge-snap: extend to neighbour's startTime if within threshold
        const { stopTime, durationSeconds } = applyResizeEdgeSnap(
          schedules,
          schedule.channelId,
          scheduleStart,
          rawDuration,
          schedule.id,
        );

        // Overlap check before calling API
        if (hasOverlap(schedules, schedule.channelId, scheduleStart, stopTime, schedule.id)) {
          onOverlapDetected();
          return;
        }

        await onResizeEnd(schedule, durationSeconds, stopTime);
      };

      document.addEventListener('pointerup', handlePointerUp, { once: true });
    },
    [onResizeEnd, onOverlapDetected, pixelsPerHour, schedules],
  );

  return { startResize };
}
