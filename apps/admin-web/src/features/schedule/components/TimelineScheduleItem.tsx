import { useDraggable } from '@dnd-kit/core';
import { Descriptions, Popover, Tag } from 'antd';
import clsx from 'clsx';
import type { CSSProperties } from 'react';
import type { Schedule } from '../types/schedule.type';
import { formatDuration, formatTimelineTime } from '../utils/timeline-time.util';

interface TimelineScheduleItemProps {
  schedule: Schedule;
  left: number;
  width: number;
  continuesFromPreviousDay?: boolean;
  continuesToNextDay?: boolean;
  selected: boolean;
  hasWarning: boolean;
  onSelect: (schedule: Schedule) => void;
  onResizeStart: (schedule: Schedule, width: number, event: React.PointerEvent) => void;
}

export function TimelineScheduleItem({
  schedule,
  left,
  width,
  continuesFromPreviousDay = false,
  continuesToNextDay = false,
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
  const statusLabel =
    schedule.status === 'PUBLISHED'
      ? 'PUB'
      : schedule.status === 'CANCELLED'
        ? 'CANCEL'
        : 'DRAFT';
  const isCompact = width < 110;
  const showDuration = width >= 170;
  const showTimeRange = width >= 92;
  const showStatus = width >= 98;
  const showCrossDayIndicator = width >= 150 && (continuesFromPreviousDay || continuesToNextDay);
  const scheduleInfo = (
    <Descriptions size="small" column={1} className="timeline-schedule-popover">
      <Descriptions.Item label="Program">{schedule.name}</Descriptions.Item>
      <Descriptions.Item label="Channel">{schedule.channel?.name ?? schedule.channelId}</Descriptions.Item>
      <Descriptions.Item label="Asset">{schedule.asset?.name ?? '-'}</Descriptions.Item>
      <Descriptions.Item label="Time">
        {formatTimelineTime(schedule.startTime)} - {formatTimelineTime(schedule.stopTime)}
      </Descriptions.Item>
      <Descriptions.Item label="Duration">{formatDuration(schedule.duration)}</Descriptions.Item>
      <Descriptions.Item label="Status">
        <Tag color={schedule.status === 'PUBLISHED' ? 'green' : schedule.status === 'CANCELLED' ? 'red' : 'blue'}>
          {schedule.status}
        </Tag>
      </Descriptions.Item>
    </Descriptions>
  );

  return (
    <Popover content={scheduleInfo} title="Program details" mouseEnterDelay={0.25}>
      <button
        ref={setNodeRef}
        type="button"
        className={clsx('timeline-schedule-item', {
          'timeline-schedule-live': type === 'LIVE',
          'timeline-schedule-vod': type === 'VOD',
          'timeline-schedule-published': schedule.status === 'PUBLISHED',
          'timeline-schedule-draft': schedule.status === 'DRAFT',
          'timeline-schedule-cancelled': schedule.status === 'CANCELLED',
          'timeline-schedule-selected': selected,
          'timeline-schedule-warning': hasWarning,
          'timeline-schedule-compact': isCompact,
          'timeline-schedule-continues-prev-day': continuesFromPreviousDay,
          'timeline-schedule-continues-next-day': continuesToNextDay,
        })}
        style={style}
        title={`${schedule.name} | ${formatTimelineTime(schedule.startTime)} - ${formatTimelineTime(schedule.stopTime)} | ${formatDuration(schedule.duration)}`}
        data-dragging={isDragging}
        onClick={() => onSelect(schedule)}
        {...listeners}
        {...attributes}
      >
        {showStatus ? (
          <span className="timeline-schedule-status" title={schedule.status}>
            {statusLabel}
          </span>
        ) : null}
        {showCrossDayIndicator ? (
          <span className="timeline-schedule-cross-day-indicator">
            {continuesFromPreviousDay ? '↗ from prev day' : null}
            {continuesFromPreviousDay && continuesToNextDay ? ' • ' : null}
            {continuesToNextDay ? '↘ next day' : null}
          </span>
        ) : null}
        <span className="timeline-schedule-title">{schedule.name}</span>
        {showTimeRange ? (
          <span className="timeline-schedule-time">
            {formatTimelineTime(schedule.startTime)} - {formatTimelineTime(schedule.stopTime)}
          </span>
        ) : null}
        {showDuration ? <span className="timeline-schedule-duration">{formatDuration(schedule.duration)}</span> : null}
        <span
          className="timeline-resize-handle"
          role="separator"
          aria-label="Resize schedule duration"
          onPointerDown={(event) => onResizeStart(schedule, width, event)}
        />
      </button>
    </Popover>
  );
}
