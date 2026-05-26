import type { Schedule } from '../types/schedule.type';
import { timeToPx } from './timeline-time.util';

export function getScheduleLeft(schedule: Schedule, dayStart: Date, pixelsPerHour: number): number {
  return timeToPx(schedule.startTime, dayStart, pixelsPerHour);
}

export function getScheduleWidth(schedule: Schedule, pixelsPerHour: number): number {
  return Math.max(24, (schedule.duration / 3600) * pixelsPerHour);
}

export function durationToWidth(durationSeconds: number, pixelsPerHour: number): number {
  return Math.max(24, (durationSeconds / 3600) * pixelsPerHour);
}

export function widthToDuration(widthPx: number, pixelsPerHour: number): number {
  const seconds = Math.round((Math.max(24, widthPx) / pixelsPerHour) * 3600);
  return Math.max(60, Math.round(seconds / 60) * 60);
}
