import { useDroppable } from '@dnd-kit/core';
import { useState } from 'react';
import type { TimelineDragPreview } from '../hooks/useScheduleDrag';
import type { Channel, Schedule, TimelineWarning } from '../types/schedule.type';
import { getScheduleRenderLayout } from '../utils/schedule-position.util';
import { TimelineScheduleItem } from './TimelineScheduleItem';
import { resolveMediaUrl } from '../../../utils/media-url';

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
        <ChannelLogo channel={channel} />
        <div className="timeline-channel-meta">
          <span>{channel.name}</span>
          {channel.epgId ? <small>{channel.epgId}</small> : null}
        </div>
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

function ChannelLogo({ channel }: { channel: Channel }) {
  const [failed, setFailed] = useState(false);
  const hasLogo = Boolean(channel.logoUrl) && !failed;

  if (hasLogo) {
    return (
      <div className="timeline-channel-logo-box" aria-hidden="true">
        <img
          src={resolveMediaUrl(channel.logoUrl) ?? ''}
          alt=""
          className="timeline-channel-logo-img"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  const initials = channel.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="timeline-channel-logo-box timeline-channel-logo-fallback" aria-hidden="true">
      <span>{initials || 'TV'}</span>
    </div>
  );
}
