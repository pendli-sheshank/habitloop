function toUTCDayString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getUTCDayKey(timestampMs: number): string {
  return toUTCDayString(new Date(timestampMs));
}

export function getYesterdayKey(timestampMs: number): string {
  return toUTCDayString(new Date(timestampMs - 86_400_000));
}
