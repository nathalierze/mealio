// Berechnet die ISO-8601-Kalenderwoche als String, z.B. "2026-W38".
export function getCurrentWeekIdentifier(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Montag=1 ... Sonntag=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Donnerstag dieser Woche
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
