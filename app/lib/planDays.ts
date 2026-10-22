// Reine Datumsfunktionen für den Wochenplan nach Tagen. Rollierendes
// Fenster ab dem lokalen Gerätedatum (kein Kalenderwochen-Bezug, siehe
// CLAUDE.md). Alle Tage werden als "YYYY-MM-DD"-Strings (lokaler Kalendertag,
// keine Uhrzeit/Zeitzone) gehandhabt - das entspricht dem Format, das
// Postgres für eine `date`-Spalte über die Supabase-API sendet/erwartet.

const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WEEKDAYS_LONG = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
];

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getToday(now: Date = new Date()): string {
  return toDateKey(now);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// Die nächsten `count` Tage ab heute (heute inklusive), als Date-Keys.
export function getRollingDateKeys(count = 7, now: Date = new Date()): string[] {
  const start = fromDateKey(getToday(now));
  return Array.from({ length: count }, (_, i) => toDateKey(addDays(start, i)));
}

export function isToday(dateKey: string, now: Date = new Date()): boolean {
  return dateKey === getToday(now);
}

export function isTomorrow(dateKey: string, now: Date = new Date()): boolean {
  return dateKey === toDateKey(addDays(fromDateKey(getToday(now)), 1));
}

// Ein Eintrag gilt als "verpasst", wenn sein Tag in der Vergangenheit liegt
// und er nicht gekocht wurde - er wird dann wie "ohne Tag" behandelt, bleibt
// aber mit seinem ursprünglichen Datum für den Hinweistext in der DB stehen.
export function isMissed(
  plannedFor: string | null,
  cookedAt: string | null,
  now: Date = new Date()
): boolean {
  if (!plannedFor || cookedAt) return false;
  return plannedFor < getToday(now);
}

export function formatShortDate(dateKey: string): string {
  const date = fromDateKey(dateKey);
  const weekday = WEEKDAYS_SHORT[date.getDay()];
  const day = date.getDate();
  const month = date.getMonth() + 1;
  return `${weekday} ${day}.${month}.`;
}

export function formatWeekdayLong(dateKey: string): string {
  return WEEKDAYS_LONG[fromDateKey(dateKey).getDay()];
}

export function formatDayMonth(dateKey: string): string {
  const date = fromDateKey(dateKey);
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}
