import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import type { CSSProperties } from 'react';
import type { Schedule } from '../types/schedule.type';
import { formatDuration, formatTimelineTime } from '../utils/timeline-time.util';

interface TimelineScheduleItemProps {
  schedule: Schedule;
  left: number;
  width: number;
  selected: boolean;
  hasWarning: boolean;
  onSelect: (schedule: Schedule) => void;
  onResizeStart: (schedule: Schedule, width: number, event: React.PointerEvent) => void;
}

export function TimelineScheduleItem({
  schedule,
  left,
  width,
  selected,
  hasWarning,
  onSelect,
  onResizeStart,
}: TimelineScheduleItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `schedule:${schedule.id}`,
    data: {
      kind: 'schedule',
      schedule,
    },
  });
  const style: CSSProperties = {
    left,
    width,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };
  const type = schedule.asset?.type ?? 'VOD';

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={clsx('timeline-schedule-item', {
        'timeline-schedule-live': type === 'LIVE',
        'timeline-schedule-vod': type === 'VOD',
        'timeline-schedule-selected': selected,
        'timeline-schedule-warning': hasWarning,
      })}
      style={style}
      data-dragging={isDragging}
      onClick={() => onSelect(schedule)}
      {...listeners}
      {...attributes}
    >
      <span className="timeline-schedule-title">{schedule.name}</span>
      <span className="timeline-schedule-time">
        {formatTimelineTime(schedule.startTime)} - {formatTimelineTime(schedule.stopTime)}
      </span>
      <span className="timeline-schedule-duration">{formatDuration(schedule.duration)}</span>
      <span
        className="timeline-resize-handle"
        role="separator"
        aria-label="Resize schedule duration"
        onPointerDown={(event) => onResizeStart(schedule, width, event)}
      />
    </button>
  );
}
