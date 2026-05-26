import { useDroppable } from '@dnd-kit/core';
import type { TimelineDragPreview } from '../hooks/useScheduleDrag';
import type { Channel, Schedule, TimelineWarning } from '../types/schedule.type';
import { getScheduleRenderLayout } from '../utils/schedule-position.util';
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
  dragPreview?: TimelineDragPreview | null;
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
  dragPreview,
}: TimelineChannelRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `channel:${channel.id}`,
  });
  const warningScheduleIds = new Set(
    warnings.map((warning) => warning.scheduleId).filter((scheduleId): scheduleId is string => Boolean(scheduleId)),
  );
  const visibleSchedules = schedules
    .filter((schedule) => schedule.status !== 'CANCELLED')
    .map((schedule) => ({
      schedule,
      layout: getScheduleRenderLayout(schedule, dayStart, pixelsPerHour),
    }))
    .filter((item) => item.layout.isVisible);

  const previewForRow = dragPreview?.channelId === channel.id ? dragPreview : null;

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
        data-preview-valid={previewForRow ? (!previewForRow.isOverlap).toString() : undefined}
        data-preview-invalid={previewForRow?.isOverlap ? 'true' : undefined}
        data-timeline-row={channel.id}
        style={{ width: timelineWidth }}
      >
        {previewForRow ? (
          <div
            className="timeline-drag-preview-ghost"
            data-invalid={previewForRow.isOverlap}
            style={{
              left: previewForRow.leftPx,
              width: previewForRow.widthPx,
            }}
          />
        ) : null}
        {visibleSchedules.length === 0 ? (
          <div className="timeline-row-empty">No schedules for selected date</div>
        ) : (
          visibleSchedules.map(({ schedule, layout }) => (
            <TimelineScheduleItem
              key={schedule.id}
              schedule={schedule}
              left={layout.left}
              width={layout.width}
              continuesFromPreviousDay={layout.continuesFromPreviousDay}
              continuesToNextDay={layout.continuesToNextDay}
              selected={schedule.id === selectedScheduleId}
              hasWarning={warningScheduleIds.has(schedule.id)}
              onSelect={onSelectSchedule}
              onResizeStart={onResizeStart}
            />
          ))
        )}
      </div>
    </div>
  );
}
