import { Empty, Spin } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import type { TimelineDragPreview } from '../hooks/useScheduleDrag';
import type { Channel, Schedule, TimelineWarning } from '../types/schedule.type';
import { formatTimelineTime, getDayStart, timeToPx } from '../utils/timeline-time.util';
import { createTimeLabels } from '../utils/timeline.util';
import { TimelineChannelRow } from './TimelineChannelRow';
import { TimelineHeader } from './TimelineHeader';
import { TimelineMiniMap } from './TimelineMiniMap';

const TIMELINE_LABEL_COLUMN_WIDTH = 180;

interface TimelineGridProps {
  channels: Channel[];
  schedules: Schedule[];
  selectedDate: string;
  selectedScheduleId?: string;
  warnings: TimelineWarning[];
  loading: boolean;
  dayStart: Date;
  pixelsPerHour: number;
  /** True when the system has channels but the user hasn't selected one yet. */
  noChannelSelected?: boolean;
  onSelectSchedule: (schedule: Schedule) => void;
  onResizeStart: (schedule: Schedule, width: number, event: React.PointerEvent) => void;
  dragPreview?: TimelineDragPreview | null;
}

export function TimelineGrid({
  channels,
  schedules,
  selectedDate,
  selectedScheduleId,
  warnings,
  loading,
  dayStart,
  pixelsPerHour,
  noChannelSelected = false,
  onSelectSchedule,
  onResizeStart,
  dragPreview,
}: TimelineGridProps) {
  const labels = useMemo(() => createTimeLabels(selectedDate), [selectedDate]);
  const timelineWidth = pixelsPerHour * 24;
  const [now, setNow] = useState(() => dayjs());
  const isTodayView = dayjs(selectedDate).isSame(dayjs(), 'day');

  useEffect(() => {
    if (!isTodayView) {
      return;
    }

    const timer = window.setInterval(() => setNow(dayjs()), 30_000);
    return () => window.clearInterval(timer);
  }, [isTodayView]);

  const nowCursorLeft = useMemo(() => {
    if (!isTodayView) {
      return null;
    }

    return timeToPx(now.toDate(), getDayStart(selectedDate), pixelsPerHour);
  }, [isTodayView, now, pixelsPerHour, selectedDate]);

  if (channels.length === 0) {
    return (
      <div className="schedule-timeline-empty">
        <Empty
          description={
            noChannelSelected
              ? 'Select a channel to view the timeline'
              : 'No channels available'
          }
        />
      </div>
    );
  }

  return (
    <div className="timeline-grid-panel">
      <Spin spinning={loading}>
        <div className="timeline-scroll">
          <div className="timeline-grid-inner" style={{ width: timelineWidth }}>
            <TimelineHeader labels={labels} pixelsPerHour={pixelsPerHour} />
            {typeof nowCursorLeft === 'number' && nowCursorLeft >= 0 && nowCursorLeft <= timelineWidth ? (
              <div className="timeline-now-cursor" style={{ left: nowCursorLeft + TIMELINE_LABEL_COLUMN_WIDTH }}>
                <span>NOW {now.format('HH:mm')}</span>
              </div>
            ) : null}
            {channels.map((channel) => (
              <TimelineChannelRow
                key={channel.id}
                channel={channel}
                schedules={schedules.filter((schedule) => schedule.channelId === channel.id)}
                selectedScheduleId={selectedScheduleId}
                warnings={warnings}
                dayStart={dayStart}
                timelineWidth={timelineWidth}
                pixelsPerHour={pixelsPerHour}
                onSelectSchedule={onSelectSchedule}
                onResizeStart={onResizeStart}
                dragPreview={dragPreview}
              />
            ))}
          </div>
        </div>
        {dragPreview ? (
          <div
            className="timeline-drag-guide"
            style={{ left: dragPreview.leftPx + 180 }}
            data-invalid={dragPreview.isOverlap}
          >
            <span>{formatTimelineTime(dragPreview.startTime)}</span>
          </div>
        ) : null}
        <TimelineMiniMap
          channels={channels}
          schedules={schedules}
          selectedScheduleId={selectedScheduleId}
          dayStart={dayStart}
          pixelsPerHour={pixelsPerHour}
          onSelectSchedule={onSelectSchedule}
        />
      </Spin>
    </div>
  );
}
