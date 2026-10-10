// ─── Time & Date Utilities (IST, Asia/Kolkata) ───

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Format a UTC ISO string into IST time (e.g., "2:30 PM")
 */
export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Format start and end times into a clean range (e.g., "2:00 PM – 4:00 PM")
 */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)} – ${formatTime(endIso)}`;
}

/**
 * Format date into "Today", "Tomorrow", or "Sat, 10 Oct"
 */
export function formatDateLabel(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();

  const istDateStr = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: IST_TIMEZONE }).format(d);

  const todayStr = istDateStr(now);
  const targetStr = istDateStr(date);

  // Tomorrow check
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = istDateStr(tomorrow);

  if (targetStr === todayStr) return "Today";
  if (targetStr === tomorrowStr) return "Tomorrow";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

/**
 * Overlap formula: startA < endB && endA > startB
 * Back-to-back events (startA === endB) are strictly NOT a clash.
 */
export function hasClash(
  startA: string | Date,
  endA: string | Date,
  startB: string | Date,
  endB: string | Date
): boolean {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  return sA < eB && eA > sB;
}

/**
 * Calculate seconds remaining until expiry timestamp
 */
export function getRemainingSeconds(expiresAtIso: string): number {
  const target = new Date(expiresAtIso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((target - now) / 1000));
}
