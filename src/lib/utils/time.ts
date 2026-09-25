/**
 * Authoritative time and duration calculation utilities for BugBusters.
 * Derives elapsed time strictly from start and end/submission timestamps.
 */

export function calculateDurationSeconds(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): number {
  if (!startTime) return 0;
  try {
    const start = new Date(startTime).getTime();
    if (isNaN(start)) return 0;

    let end = endTime ? new Date(endTime).getTime() : Date.now();
    if (isNaN(end) || end < start) end = Date.now();

    return Math.max(0, Math.floor((end - start) / 1000));
  } catch {
    return 0;
  }
}

export function formatDurationSeconds(diffSec: number): string {
  if (diffSec <= 0) return '0s';

  const hours = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function calculateAuthoritativeDuration(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): { seconds: number; formatted: string; isRunning: boolean } {
  if (!startTime) {
    return { seconds: 0, formatted: '—', isRunning: false };
  }

  const isRunning = !endTime;
  const seconds = calculateDurationSeconds(startTime, endTime);
  const formatted = formatDurationSeconds(seconds);

  return {
    seconds,
    formatted,
    isRunning,
  };
}

export function formatTimeClock(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '—';
  }
}
