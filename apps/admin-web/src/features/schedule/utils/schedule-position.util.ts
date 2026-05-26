import dayjs from 'dayjs';
import type { Schedule } from '../types/schedule.type';
import { addSeconds, getDurationSeconds, timeToPx } from './timeline-time.util';

// ── Position helpers ─────────────────────────────────────────────────────────

export function getScheduleLeft(schedule: Schedule, dayStart: Date, pixelsPerHour: number): number {
  return timeToPx(schedule.startTime, dayStart, pixelsPerHour);
}

export function getScheduleWidth(schedule: Schedule, pixelsPerHour: number): number {
  return Math.max(10, (schedule.duration / 3600) * pixelsPerHour);
}

export interface ScheduleRenderLayout {
  left: number;
  width: number;
  isVisible: boolean;
  continuesFromPreviousDay: boolean;
  continuesToNextDay: boolean;
}

/**
 * Returns timeline layout for a schedule clipped to the currently viewed day.
 * One schedule stays one record in DB; we only clip its visual segment.
 */
export function getScheduleRenderLayout(
  schedule: Schedule,
  dayStart: Date,
  pixelsPerHour: number,
): ScheduleRenderLayout {
  const scheduleStart = dayjs(schedule.startTime);
  const scheduleStop = dayjs(schedule.stopTime);
  const dayStartTime = dayjs(dayStart);
  const dayEndTime = dayStartTime.add(1, 'day');

  const continuesFromPreviousDay = scheduleStart.isBefore(dayStartTime);
  const continuesToNextDay = scheduleStop.isAfter(dayEndTime);

  const visibleStart = continuesFromPreviousDay ? dayStartTime : scheduleStart;
  const visibleStop = continuesToNextDay ? dayEndTime : scheduleStop;

  if (!visibleStop.isAfter(dayStartTime) || !visibleStart.isBefore(dayEndTime) || !visibleStop.isAfter(visibleStart)) {
    return {
      left: 0,
      width: 0,
      isVisible: false,
      continuesFromPreviousDay,
      continuesToNextDay,
    };
  }

  const visibleDurationSeconds = visibleStop.diff(visibleStart, 'second');

  return {
    left: timeToPx(visibleStart.toDate(), dayStart, pixelsPerHour),
    width: Math.max(10, (visibleDurationSeconds / 3600) * pixelsPerHour),
    isVisible: true,
    continuesFromPreviousDay,
    continuesToNextDay,
  };
}

export function durationToWidth(durationSeconds: number, pixelsPerHour: number): number {
  return Math.max(10, (durationSeconds / 3600) * pixelsPerHour);
}

export function widthToDuration(widthPx: number, pixelsPerHour: number): number {
  // Snap to the nearest 5-minute boundary
  const rawSeconds = Math.max(24, widthPx) / pixelsPerHour * 3600;
  const snapSeconds = 5 * 60; // 5 minutes
  return Math.max(5 * 60, Math.round(rawSeconds / snapSeconds) * snapSeconds);
}

// ── Schedule neighbour finders ───────────────────────────────────────────────

/**
 * Returns the schedule on `channelId` whose stopTime is closest to and <=
 * `startTime`, optionally excluding `excludeId` (the schedule being moved).
 */
export function findPreviousSchedule(
  schedules: Schedule[],
  channelId: string,
  startTime: Date,
  excludeId?: string,
): Schedule | null {
  const candidates = schedules.filter(
    (s) =>
      s.channelId === channelId &&
      s.status !== 'CANCELLED' &&
      s.id !== excludeId &&
      dayjs(s.stopTime).isBefore(dayjs(startTime).add(1, 'second')),
  );

  if (candidates.length === 0) return null;

  return candidates.reduce((best, s) =>
    dayjs(s.stopTime).isAfter(dayjs(best.stopTime)) ? s : best,
  );
}

/**
 * Returns the schedule on `channelId` whose startTime is closest to and >=
 * `stopTime`, optionally excluding `excludeId`.
 */
export function findNextSchedule(
  schedules: Schedule[],
  channelId: string,
  stopTime: Date,
  excludeId?: string,
): Schedule | null {
  const candidates = schedules.filter(
    (s) =>
      s.channelId === channelId &&
      s.status !== 'CANCELLED' &&
      s.id !== excludeId &&
      dayjs(s.startTime).isAfter(dayjs(stopTime).subtract(1, 'second')),
  );

  if (candidates.length === 0) return null;

  return candidates.reduce((best, s) =>
    dayjs(s.startTime).isBefore(dayjs(best.startTime)) ? s : best,
  );
}

// ── Overlap detection ────────────────────────────────────────────────────────

/**
 * Returns true if the proposed [newStart, newStop) overlaps any existing
 * schedule on the same channel (excluding `excludeId`).
 */
export function hasOverlap(
  schedules: Schedule[],
  channelId: string,
  newStartTime: Date,
  newStopTime: Date,
  excludeId?: string,
): boolean {
  return schedules.some(
    (s) =>
      s.channelId === channelId &&
      s.status !== 'CANCELLED' &&
      s.id !== excludeId &&
      dayjs(s.startTime).isBefore(newStopTime) &&
      dayjs(s.stopTime).isAfter(newStartTime),
  );
}

// ── Edge snap ────────────────────────────────────────────────────────────────

const EDGE_SNAP_THRESHOLD_MINUTES = 10;

interface EdgeSnapInput {
  schedules: Schedule[];
  channelId: string;
  /** The candidate start time after coarse 5-min snap. */
  startTime: Date;
  /** Duration of the schedule being placed/moved (seconds). */
  durationSeconds: number;
  /** ID of the schedule being moved (excluded from neighbour search). */
  excludeId?: string;
}

interface EdgeSnapResult {
  startTime: Date;
  stopTime: Date;
  durationSeconds: number;
  /** True when start was snapped to a neighbour's stopTime. */
  snappedToStart: boolean;
  /** True when stop was snapped to a neighbour's startTime. */
  snappedToStop: boolean;
}

/**
 * Applies edge-snap logic:
 * 1. If the proposed startTime is within the threshold of the previous
 *    schedule's stopTime, snap start to that stopTime exactly.
 * 2. If the resulting stopTime is within the threshold of the next
 *    schedule's startTime, snap stop to that startTime and extend duration.
 */
export function applyEdgeSnap(input: EdgeSnapInput): EdgeSnapResult {
  const { schedules, channelId, startTime, durationSeconds, excludeId } = input;
  const thresholdMs = EDGE_SNAP_THRESHOLD_MINUTES * 60 * 1000;

  let resolvedStart = startTime;
  let resolvedDuration = durationSeconds;
  let snappedToStart = false;
  let snappedToStop = false;

  // 1. Try to snap start → previous.stopTime
  const prev = findNearestStopEdge(schedules, channelId, startTime, thresholdMs, excludeId);

  if (prev) {
    const gapMs = Math.abs(dayjs(resolvedStart).diff(dayjs(prev.stopTime), 'millisecond'));

    resolvedStart = dayjs(prev.stopTime).toDate();
    snappedToStart = gapMs <= thresholdMs;
  }

  // 2. Compute stop from (possibly adjusted) start + original duration
  let resolvedStop = addSeconds(resolvedStart, resolvedDuration);

  // 3. Try to snap stop → next.startTime
  const next = findNearestStartEdge(schedules, channelId, resolvedStop, thresholdMs, excludeId);

  if (next) {
    const gapMs = Math.abs(dayjs(resolvedStop).diff(dayjs(next.startTime), 'millisecond'));

    resolvedStop = dayjs(next.startTime).toDate();
    resolvedDuration = getDurationSeconds(resolvedStart, resolvedStop);
    snappedToStop = gapMs <= thresholdMs;
  }

  return {
    startTime: resolvedStart,
    stopTime: resolvedStop,
    durationSeconds: resolvedDuration,
    snappedToStart,
    snappedToStop,
  };
}

/**
 * Applies edge-snap specifically for resize (only the stop edge can snap).
 */
export function applyResizeEdgeSnap(
  schedules: Schedule[],
  channelId: string,
  startTime: Date,
  rawDurationSeconds: number,
  excludeId?: string,
): { stopTime: Date; durationSeconds: number } {
  const thresholdMs = EDGE_SNAP_THRESHOLD_MINUTES * 60 * 1000;

  // Snap duration to 5-minute grid first
  const snapSeconds = 5 * 60;
  const snappedDuration = Math.max(5 * 60, Math.round(rawDurationSeconds / snapSeconds) * snapSeconds);
  let resolvedStop = addSeconds(startTime, snappedDuration);
  let resolvedDuration = snappedDuration;

  // Try to snap stop → next schedule's startTime
  const next = findNearestStartEdge(schedules, channelId, resolvedStop, thresholdMs, excludeId);

  if (next) {
    const gapMs = Math.abs(dayjs(resolvedStop).diff(dayjs(next.startTime), 'millisecond'));

    resolvedStop = dayjs(next.startTime).toDate();
    resolvedDuration = getDurationSeconds(startTime, resolvedStop);
  }

  return { stopTime: resolvedStop, durationSeconds: resolvedDuration };
}

function findNearestStopEdge(
  schedules: Schedule[],
  channelId: string,
  startTime: Date,
  thresholdMs: number,
  excludeId?: string,
): Schedule | null {
  return findNearestEdge(
    schedules.filter(
      (s) =>
        s.channelId === channelId &&
        s.status !== 'CANCELLED' &&
        s.id !== excludeId &&
        Math.abs(dayjs(s.stopTime).diff(startTime, 'millisecond')) <= thresholdMs,
    ),
    (schedule) => schedule.stopTime,
    startTime,
  );
}

function findNearestStartEdge(
  schedules: Schedule[],
  channelId: string,
  stopTime: Date,
  thresholdMs: number,
  excludeId?: string,
): Schedule | null {
  return findNearestEdge(
    schedules.filter(
      (s) =>
        s.channelId === channelId &&
        s.status !== 'CANCELLED' &&
        s.id !== excludeId &&
        Math.abs(dayjs(s.startTime).diff(stopTime, 'millisecond')) <= thresholdMs,
    ),
    (schedule) => schedule.startTime,
    stopTime,
  );
}

function findNearestEdge(
  candidates: Schedule[],
  getEdgeTime: (schedule: Schedule) => string,
  target: Date,
): Schedule | null {
  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, schedule) => {
    const bestDistance = Math.abs(dayjs(getEdgeTime(best)).diff(target, 'millisecond'));
    const scheduleDistance = Math.abs(dayjs(getEdgeTime(schedule)).diff(target, 'millisecond'));

    return scheduleDistance < bestDistance ? schedule : best;
  });
}
