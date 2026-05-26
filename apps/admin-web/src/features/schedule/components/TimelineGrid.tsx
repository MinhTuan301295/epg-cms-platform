import FullCalendar from '@fullcalendar/react';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import { Empty, Spin } from 'antd';
import type { Channel, Schedule, TimelineWarning } from '../types/schedule.type';
import { createTimeLabels } from '../utils/timeline.util';
import { TimelineChannelRow } from './TimelineChannelRow';
import { TimelineHeader } from './TimelineHeader';

interface TimelineGridProps {
  channels: Channel[];
  schedules: Schedule[];
  selectedDate: string;
  selectedScheduleId?: string;
  warnings: TimelineWarning[];
  loading: boolean;
  dayStart: Date;
  pixelsPerHour: number;
  onSelectSchedule: (schedule: Schedule) => void;
  onResizeStart: (schedule: Schedule, width: number, event: React.PointerEvent) => void;
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
  onSelectSchedule,
  onResizeStart,
}: TimelineGridProps) {
  const labels = createTimeLabels(selectedDate);
  const timelineWidth = pixelsPerHour * 24;

  if (channels.length === 0) {
    return (
      <div className="schedule-timeline-empty">
        <Empty description="No channels available" />
      </div>
    );
  }

  return (
    <div className="timeline-grid-panel">
      <Spin spinning={loading}>
        <div className="timeline-scroll">
          <div className="timeline-grid-inner" style={{ width: timelineWidth }}>
            <TimelineHeader labels={labels} pixelsPerHour={pixelsPerHour} />
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
              />
            ))}
          </div>
        </div>
        <div className="timeline-calendar-adapter">
          <FullCalendar
            plugins={[resourceTimelinePlugin, interactionPlugin]}
            schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
            initialView="resourceTimelineDay"
            initialDate={selectedDate}
            headerToolbar={false}
            height={120}
            resources={channels.map((channel) => ({
              id: channel.id,
              title: channel.name,
            }))}
            events={schedules.map((schedule) => ({
              id: schedule.id,
              resourceId: schedule.channelId,
              title: schedule.name,
              start: schedule.startTime,
              end: schedule.stopTime,
            }))}
          />
        </div>
      </Spin>
    </div>
  );
}
