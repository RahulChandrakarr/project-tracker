/** Local calendar date as `YYYY-MM-DD`. */
export function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Inclusive local start/end instants for a calendar day. */
export function dayBounds(key: string): { start: string; end: string } {
  const d = parseDateKey(key);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function monthRange(
  year: number,
  month: number,
): { startKey: string; endKey: string; daysInMonth: number } {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  return {
    startKey: toDateKey(first),
    endKey: toDateKey(last),
    daysInMonth: last.getDate(),
  };
}

/** Strip HTML tags for a short plain-text preview. */
export function stripHtmlPreview(html: string, max = 80): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function todayDateKey(): string {
  return toDateKey(new Date());
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = parseDateKey(key);
  return toDateKey(d) === key;
}
