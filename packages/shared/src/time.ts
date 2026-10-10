import { APP_TIMEZONE } from './constants.js';

/**
 * Strict overlap check: startA < endB AND endA > startB.
 * Back-to-back (endA === startB) is NOT a clash.
 */
export function intervalsOverlap(
  aStart: Date | string,
  aEnd: Date | string,
  bStart: Date | string,
  bEnd: Date | string,
): boolean {
  const a0 = new Date(aStart).getTime();
  const a1 = new Date(aEnd).getTime();
  const b0 = new Date(bStart).getTime();
  const b1 = new Date(bEnd).getTime();
  return a0 < b1 && a1 > b0;
}

/**
 * Derive an event's phase from its start/end times relative to now.
 */
export function eventPhase(
  event: { startsAt: string | Date; endsAt: string | Date },
  now: Date = new Date(),
): 'LIVE' | 'TODAY' | 'UPCOMING' | 'PAST' {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const nowMs = now.getTime();

  if (nowMs >= start.getTime() && nowMs < end.getTime()) return 'LIVE';
  if (nowMs >= end.getTime()) return 'PAST';

  // Check if it starts today in the app timezone
  const todayStr = formatDate(now);
  const startStr = formatDate(start);
  if (todayStr === startStr) return 'TODAY';

  return 'UPCOMING';
}

/** Format a date as YYYY-MM-DD in the app timezone. */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(date);
}

/**
 * Format an event's time range for display.
 * "10 Oct, 2:00 – 4:00 PM" or "10 Oct, 11:00 AM – 11 Oct, 1:00 PM"
 */
export function formatEventRange(startsAt: string | Date, endsAt: string | Date): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  const dateOpts: Intl.DateTimeFormatOptions = {
    timeZone: APP_TIMEZONE,
    day: 'numeric',
    month: 'short',
  };
  const timeOpts: Intl.DateTimeFormatOptions = {
    timeZone: APP_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  const startDate = new Intl.DateTimeFormat('en-IN', dateOpts).format(start);
  const startTime = new Intl.DateTimeFormat('en-IN', timeOpts).format(start);
  const endDate = new Intl.DateTimeFormat('en-IN', dateOpts).format(end);
  const endTime = new Intl.DateTimeFormat('en-IN', timeOpts).format(end);

  if (startDate === endDate) {
    return `${startDate}, ${startTime} – ${endTime}`;
  }
  return `${startDate}, ${startTime} – ${endDate}, ${endTime}`;
}

/**
 * Format a relative time string: "in 5 min", "2 hours ago", etc.
 */
export function formatRelative(date: string | Date, now: Date = new Date()): string {
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const future = diffMs > 0;

  if (absDiffMs < 60_000) return 'just now';

  const minutes = Math.floor(absDiffMs / 60_000);
  if (minutes < 60) {
    const label = minutes === 1 ? 'min' : 'min';
    return future ? `in ${minutes} ${label}` : `${minutes} ${label} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const label = hours === 1 ? 'hour' : 'hours';
    return future ? `in ${hours} ${label}` : `${hours} ${label} ago`;
  }

  const days = Math.floor(hours / 24);
  const label = days === 1 ? 'day' : 'days';
  return future ? `in ${days} ${label}` : `${days} ${label} ago`;
}
