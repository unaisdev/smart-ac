export const DEFAULT_TIME_ZONE = 'Europe/Madrid';

export function formatClock(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function applyLeadMinutes(
  hour: number,
  minute: number,
  leadMinutes: number,
): { hour: number; minute: number } {
  const dayMinutes = 24 * 60;
  const total = (((hour * 60 + minute - leadMinutes) % dayMinutes) + dayMinutes) % dayMinutes;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

export function zonedParts(
  date: Date,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const map = new Map(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(map.get('year')),
    month: Number(map.get('month')),
    day: Number(map.get('day')),
    hour: Number(map.get('hour')),
    minute: Number(map.get('minute')),
    second: Number(map.get('second')),
  };
}

export function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i += 1) {
    const got = zonedParts(new Date(utc), timeZone);
    const gotMs = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute, got.second);
    const wantMs = Date.UTC(year, month - 1, day, hour, minute, 0);
    utc += wantMs - gotMs;
  }
  return new Date(utc);
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number,
): { year: number; month: number; day: number } {
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

export function nextOccurrenceUtc(
  hour: number,
  minute: number,
  from: Date,
  timeZone: string,
): Date {
  const parts = zonedParts(from, timeZone);
  let candidate = zonedLocalToUtc(parts.year, parts.month, parts.day, hour, minute, timeZone);
  if (candidate.getTime() <= from.getTime()) {
    const next = addCalendarDays(parts.year, parts.month, parts.day, 1);
    candidate = zonedLocalToUtc(next.year, next.month, next.day, hour, minute, timeZone);
  }
  return candidate;
}
