import { formatTimelineTime } from '../utils/timeline-time.util';

interface TimelineHeaderProps {
  labels: Date[];
  pixelsPerHour: number;
}

export function TimelineHeader({ labels, pixelsPerHour }: TimelineHeaderProps) {
  return (
    <div className="timeline-header-row">
      {labels.map((label) => (
        <div key={label.toISOString()} className="timeline-time-label" style={{ width: pixelsPerHour }}>
          {formatTimelineTime(label)}
        </div>
      ))}
    </div>
  );
}
