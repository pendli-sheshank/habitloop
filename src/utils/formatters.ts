/**
 * Format milliseconds as HH:MM:SS for timer display.
 */
export function formatTimerDisplay(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

/**
 * Format a Unix ms timestamp as a short time string (e.g. "2:30 PM").
 */
export function formatTimeOfDay(timestampMs: number): string {
  const date = new Date(timestampMs);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  const displayMin = String(minutes).padStart(2, '0');
  return `${displayHour}:${displayMin} ${ampm}`;
}
