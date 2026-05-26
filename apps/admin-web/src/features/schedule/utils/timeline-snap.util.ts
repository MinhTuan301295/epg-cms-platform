import dayjs from 'dayjs';
import type { Schedule } from '../types/schedule.type';
import { addSeconds as addSecondsBase, diffMinutes as diffMinutesBase, roundToNearestMinutes as roundBase } from './timeline-time.util';

const SNAP_THRESHOLD_MINUTES = 10;
const GRID_SNAP_MINUTES = 5;

export function roundToNearestMinutes(date: Date, minutes: number): Date {
  return roundBase(date, minutes);
}

export function addSeconds(date: Date, seconds: number): Date {
  return addSecondsBase(date, seconds);
}

export function diffMinutes(a: Date | string, b: Date | string): number {
  return diffMinutesBase(a, b);
}

export function findPreviousSchedule(
  schedules: Schedule[],
  channelId: string,
  startTime: Date,
  excludeId?: string,
): Schedule | null {
  const candidates = schedules.filter(
    (schedule) =>
      schedule.channelId === channelId
      && schedule.status !== 'CANCELLED'
      && schedule.id !== excludeId
      && !dayjs(schedule.stopTime).isAfter(startTime),
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, current) =>
    dayjs(current.stopTime).isAfter(best.stopTime) ? current : best,
  );
}

export function findNextSchedule(
  schedules: Schedule[],
  channelId: string,
  stopTime: Date,
  excludeId?: string,
): Schedule | null {
  const candidates = schedules.filter(
    (schedule) =>
      schedule.channelId === channelId
      && schedule.status !== 'CANCELLED'
      && schedule.id !== excludeId
      && !dayjs(schedule.startTime).isBefore(stopTime),
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, current) =>
    dayjs(current.startTime).isBefore(best.startTime) ? current : best,
  );
}

export function hasOverlap(
  schedules: Schedule[],
  channelId: string,
  startTime: Date,
  stopTime: Date,
  excludeId?: string,
): boolean {
  return schedules.some(
    (existing) =>
      existing.channelId === channelId
      && existing.status !== 'CANCELLED'
      && existing.id !== excludeId
      && dayjs(existing.startTime).isBefore(stopTime)
      && dayjs(existing.stopTime).isAfter(startTime),
  );
}

interface ApplyScheduleSnapInput {
  schedules: Schedule[];
  channelId: string;
  startTime: Date;
  durationSeconds: number;
  excludeId?: string;
  gridMinutes?: number;
  thresholdMinutes?: number;
}

interface ApplyScheduleSnapResult {
  startTime: Date;
  stopTime: Date;
  snappedToGrid: boolean;
  snappedToPrevious: boolean;
  snappedToNext: boolean;
}

export function applyScheduleSnap(input: ApplyScheduleSnapInput): ApplyScheduleSnapResult {
  const {
    schedules,
    channelId,
    startTime,
    durationSeconds,
    excludeId,
    gridMinutes = GRID_SNAP_MINUTES,
    thresholdMinutes = SNAP_THRESHOLD_MINUTES,
  } = input;

  let resolvedStart = roundToNearestMinutes(startTime, gridMinutes);
  let resolvedStop = addSeconds(resolvedStart, durationSeconds);

  const previous = findPreviousSchedule(schedules, channelId, resolvedStart, excludeId);
  const next = findNextSchedule(schedules, channelId, resolvedStop, excludeId);

  let snappedToPrevious = false;
  let snappedToNext = false;

  if (previous && diffMinutes(previous.stopTime, resolvedStart) <= thresholdMinutes) {
    resolvedStart = dayjs(previous.stopTime).toDate();
    resolvedStop = addSeconds(resolvedStart, durationSeconds);
    snappedToPrevious = true;
  }

  if (next && diffMinutes(next.startTime, resolvedStop) <= thresholdMinutes) {
    resolvedStop = dayjs(next.startTime).toDate();
    resolvedStart = dayjs(resolvedStop).subtract(durationSeconds, 'second').toDate();
    snappedToNext = true;
  }

  return {
    startTime: resolvedStart,
    stopTime: resolvedStop,
    snappedToGrid: true,
    snappedToPrevious,
    snappedToNext,
  };
}
