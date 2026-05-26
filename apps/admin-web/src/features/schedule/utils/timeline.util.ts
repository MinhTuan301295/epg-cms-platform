import dayjs from 'dayjs';
import type { Schedule, TimelineRange, TimelineWarning } from '../types/schedule.type';
import { getDayEnd, getDayStart } from './timeline-time.util';

export function createTimelineRange(date: string): TimelineRange {
  return {
    start: getDayStart(date),
    end: getDayEnd(date),
  };
}

export function createTimeLabels(date: string): Date[] {
  const start = dayjs(getDayStart(date));

  return Array.from({ length: 25 }, (_, index) => start.add(index, 'hour').toDate());
}

export function findOverlaps(schedules: Schedule[]): TimelineWarning[] {
  const sortedSchedules = schedules
    .filter((schedule) => schedule.status !== 'CANCELLED')
    .sort((left, right) => dayjs(left.startTime).valueOf() - dayjs(right.startTime).valueOf());
  const warnings: TimelineWarning[] = [];

  for (let index = 1; index < sortedSchedules.length; index += 1) {
    const previous = sortedSchedules[index - 1];
    const current = sortedSchedules[index];

    if (previous && current && dayjs(previous.stopTime).isAfter(current.startTime)) {
      warnings.push({
        type: 'OVERLAP',
        message: 'Schedule overlaps with existing item.',
        from: current.startTime,
        to: previous.stopTime,
        scheduleId: current.id,
      });
    }
  }

  return warnings;
}

export function findGaps(schedules: Schedule[]): TimelineWarning[] {
  const sortedSchedules = schedules
    .filter((schedule) => schedule.status !== 'CANCELLED')
    .sort((left, right) => dayjs(left.startTime).valueOf() - dayjs(right.startTime).valueOf());
  const warnings: TimelineWarning[] = [];

  for (let index = 1; index < sortedSchedules.length; index += 1) {
    const previous = sortedSchedules[index - 1];
    const current = sortedSchedules[index];

    if (previous && current && dayjs(previous.stopTime).isBefore(current.startTime)) {
      warnings.push({
        type: 'GAP',
        message: 'Gap detected between schedules.',
        from: previous.stopTime,
        to: current.startTime,
      });
    }
  }

  return warnings;
}
