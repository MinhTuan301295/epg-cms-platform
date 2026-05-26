import { useCallback } from 'react';
import type { Schedule } from '../types/schedule.type';
import { widthToDuration } from '../utils/schedule-position.util';

interface UseScheduleResizeOptions {
  pixelsPerHour: number;
  onResizeEnd: (schedule: Schedule, duration: number) => Promise<void>;
}

export function useScheduleResize({ pixelsPerHour, onResizeEnd }: UseScheduleResizeOptions) {
  const startResize = useCallback(
    (schedule: Schedule, initialWidth: number, event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;

      const handlePointerUp = async (pointerEvent: PointerEvent) => {
        document.removeEventListener('pointerup', handlePointerUp);
        const width = initialWidth + pointerEvent.clientX - startX;
        const duration = widthToDuration(width, pixelsPerHour);

        await onResizeEnd(schedule, duration);
      };

      document.addEventListener('pointerup', handlePointerUp, { once: true });
    },
    [onResizeEnd, pixelsPerHour],
  );

  return {
    startResize,
  };
}
