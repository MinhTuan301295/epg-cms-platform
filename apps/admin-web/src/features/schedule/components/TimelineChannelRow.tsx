import { useDroppable } from '@dnd-kit/core';
import type { Channel, Schedule, TimelineWarning } from '../types/schedule.type';
import { getScheduleLeft, getScheduleWidth } from '../utils/schedule-position.util';
import { TimelineScheduleItem } from './TimelineScheduleItem';

interface TimelineChannelRowProps {
  channel: Channel;
  schedules: Schedule[];
  selectedScheduleId?: string;
  warnings: TimelineWarning[];
  dayStart: Date;
  timelineWidth: number;
  pixelsPerHour: number;
  onSelectSchedule: (schedule: Schedule) => void;
  onResizeStart: (schedule: Schedule, width: number, event: React.PointerEvent) => void;
}

export function TimelineChannelRow({
  channel,
  schedules,
  selectedScheduleId,
  warnings,
  dayStart,
  timelineWidth,
  pixelsPerHour,
  onSelectSchedule,
  onResizeStart,
}: TimelineChannelRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `channel:${channel.id}`,
  });
  const warningScheduleIds = new Set(
    warnings.map((warning) => warning.scheduleId).filter((scheduleId): scheduleId is string => Boolean(scheduleId)),
  );

  return (
    <div className="timeline-channel-row-shell">
      <div className="timeline-channel-label">
        <span>{channel.name}</span>
        {channel.epgId ? <small>{channel.epgId}</small> : null}
      </div>
      <div
        ref={setNodeRef}
        className="timeline-channel-row"
        data-over={isOver}
        data-timeline-row={channel.id}
        style={{ width: timelineWidth }}
      >
        {schedules.map((schedule) => {
          const left = getScheduleLeft(schedule, dayStart, pixelsPerHour);
          const width = getScheduleWidth(schedule, pixelsPerHour);

          return (
            <TimelineScheduleItem
              key={schedule.id}
              schedule={schedule}
              left={left}
              width={width}
              selected={schedule.id === selectedScheduleId}
              hasWarning={warningScheduleIds.has(schedule.id)}
              onSelect={onSelectSchedule}
              onResizeStart={onResizeStart}
            />
          );
        })}
      </div>
    </div>
  );
}
