import dayjs from 'dayjs';

const secondsInDay = 24 * 60 * 60;

export function getDayStart(date: string): Date {
  return dayjs(date).startOf('day').toDate();
}

export function getDayEnd(date: string): Date {
  return dayjs(date).add(1, 'day').startOf('day').toDate();
}

export function secondsFromDayStart(time: Date | string, dayStart: Date): number {
  return Math.max(0, dayjs(time).diff(dayStart, 'second'));
}

export function timeToPx(time: Date | string, dayStart: Date, pixelsPerHour: number): number {
  const seconds = secondsFromDayStart(time, dayStart);
  return (seconds / 3600) * pixelsPerHour;
}

export function pxToTime(offsetPx: number, dayStart: Date, pixelsPerHour: number): Date {
  const seconds = Math.max(0, Math.min(secondsInDay, (offsetPx / pixelsPerHour) * 3600));
  return dayjs(dayStart).add(seconds, 'second').toDate();
}

export function snapTime(time: Date, intervalMinutes = 5): Date {
  const intervalSeconds = intervalMinutes * 60;
  const unix = dayjs(time).unix();
  const snappedUnix = Math.round(unix / intervalSeconds) * intervalSeconds;

  return dayjs.unix(snappedUnix).toDate();
}

export function formatTimelineTime(time: Date | string): string {
  return dayjs(time).format('HH:mm');
}

export function formatDuration(seconds: number): string {
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} min`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
