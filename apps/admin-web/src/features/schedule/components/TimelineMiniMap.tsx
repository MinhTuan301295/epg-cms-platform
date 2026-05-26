import dayjs from 'dayjs';
import clsx from 'clsx';
import type { Channel, Schedule } from '../types/schedule.type';
import { getScheduleRenderLayout } from '../utils/schedule-position.util';

const RESOURCE_COLUMN_WIDTH = 180;
const HOURS_PER_DAY = 24;

interface TimelineMiniMapProps {
  channels: Channel[];
  schedules: Schedule[];
  selectedScheduleId?: string;
  dayStart: Date;
  pixelsPerHour: number;
  onSelectSchedule: (schedule: Schedule) => void;
}

function formatHourLabel(hour: number): string {
  const normalized = hour % 24;

  if (normalized === 0) {
    return '12am';
  }

  if (normalized < 12) {
    return `${normalized}am`;
  }

  if (normalized === 12) {
    return '12pm';
  }

  return `${normalized - 12}pm`;
}

export function TimelineMiniMap({
  channels,
  schedules,
  selectedScheduleId,
  dayStart,
  pixelsPerHour,
  onSelectSchedule,
}: TimelineMiniMapProps) {
  const timelineWidth = pixelsPerHour * HOURS_PER_DAY;
  const timelineCanvasWidth = timelineWidth + RESOURCE_COLUMN_WIDTH;

  return (
    <section className="timeline-minimap-shell" aria-label="Resources mini timeline">
      <div className="timeline-minimap-scroller">
        <div className="timeline-minimap-canvas" style={{ width: timelineCanvasWidth }}>
          <div className="timeline-minimap-header-row">
            <div className="timeline-minimap-resource-header">Resources</div>
            <div className="timeline-minimap-time-track" style={{ width: timelineWidth }}>
              {Array.from({ length: HOURS_PER_DAY }, (_, hour) => (
                <div
                  key={`mini-hour-${hour}`}
                  className="timeline-minimap-hour-label"
                  style={{ left: hour * pixelsPerHour, width: pixelsPerHour }}
                >
                  {formatHourLabel(hour)}
                </div>
              ))}
            </div>
          </div>

          <div className="timeline-minimap-body">
            {channels.map((channel) => {
              const rowSchedules = schedules
                .filter((schedule) => schedule.channelId === channel.id && schedule.status !== 'CANCELLED')
                .map((schedule) => ({
                  schedule,
                  layout: getScheduleRenderLayout(schedule, dayStart, pixelsPerHour),
                }))
                .filter((item) => item.layout.isVisible);

              return (
                <div key={channel.id} className="timeline-minimap-row">
                  <div className="timeline-minimap-channel-label">
                    <span>{channel.name}</span>
                    {channel.epgId ? <small>{channel.epgId}</small> : null}
                  </div>

                  <div className="timeline-minimap-row-track" style={{ width: timelineWidth }}>
                    {rowSchedules.map(({ schedule, layout }) => (
                      <button
                        key={schedule.id}
                        type="button"
                        className={clsx('timeline-minimap-event', {
                          'timeline-minimap-event-live': schedule.asset?.type === 'LIVE',
                          'timeline-minimap-event-vod': (schedule.asset?.type ?? 'VOD') === 'VOD',
                          'timeline-minimap-event-draft': schedule.status === 'DRAFT',
                          'timeline-minimap-event-published': schedule.status === 'PUBLISHED',
                          'timeline-minimap-event-selected': schedule.id === selectedScheduleId,
                        })}
                        style={{ left: layout.left, width: layout.width }}
                        onClick={() => onSelectSchedule(schedule)}
                        title={`${schedule.name} • ${dayjs(schedule.startTime).format('HH:mm')} - ${dayjs(schedule.stopTime).format('HH:mm')}`}
                      >
                        <span className="timeline-minimap-event-title">{schedule.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
