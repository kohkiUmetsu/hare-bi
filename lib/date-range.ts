const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildDefaultDateRange(days = 6): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return { start: formatDate(start), end: formatDate(end) };
}

export function parseDateParam(value: string | undefined, fallback: string): string {
  if (!value || !datePattern.test(value)) {
    return fallback;
  }

  const timestamp = Date.parse(`${value}T00:00:00Z`);

  if (Number.isNaN(timestamp)) {
    return fallback;
  }

  return value;
}

export function normalizeDateRange(start: string, end: string): { start: string; end: string } {
  return start <= end ? { start, end } : { start: end, end: start };
}
