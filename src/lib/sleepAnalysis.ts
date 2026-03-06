import type { HealthRecord, DayData } from './types';

export interface SleepData {
  total: number | null;    // hours
  core: number | null;
  deep: number | null;
  rem: number | null;
  awake: number | null;
  asleep: number | null;
}

/**
 * Extract sleep data for a given day.
 *
 * Health Auto Export records sleep as a single summary row at midnight (00:00).
 * The sleep data at 00:00 on day N describes the sleep that occurred the
 * previous night (falling asleep on day N-1, waking up on day N).
 *
 * So when viewing day N, we show the sleep data from the 00:00 row of day N
 * (i.e. the sleep the user woke up from on that morning).
 */
export function extractSleepData(records: HealthRecord[]): SleepData {
  let total: number | null = null;
  let core: number | null = null;
  let deep: number | null = null;
  let rem: number | null = null;
  let awake: number | null = null;
  let asleep: number | null = null;

  for (const r of records) {
    if (r.sleepTotal !== null && total === null) total = r.sleepTotal;
    if (r.sleepCore !== null && core === null) core = r.sleepCore;
    if (r.sleepDeep !== null && deep === null) deep = r.sleepDeep;
    if (r.sleepREM !== null && rem === null) rem = r.sleepREM;
    if (r.sleepAwake !== null && awake === null) awake = r.sleepAwake;
    if (r.sleepAsleep !== null && asleep === null) asleep = r.sleepAsleep;
  }

  return { total, core, deep, rem, awake, asleep };
}

/**
 * Format hours as "Xh Ym"
 */
export function formatHours(hours: number | null): string {
  if (hours === null) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Get a quality assessment of sleep based on deep sleep duration.
 * This is a simple heuristic — deep sleep is the most restorative phase.
 */
export function sleepQualityLabel(deep: number | null, total: number | null): { label: string; color: string } {
  if (deep === null || total === null || total === 0) {
    return { label: 'No data', color: 'text-gray-500' };
  }

  const deepPercent = (deep / total) * 100;

  // Apple Health guidelines: ~15-25% of total sleep should be deep
  if (deepPercent >= 20) return { label: 'Good', color: 'text-emerald-400' };
  if (deepPercent >= 12) return { label: 'Fair', color: 'text-yellow-400' };
  return { label: 'Low deep sleep', color: 'text-orange-400' };
}

/**
 * Find morning HRV: the first HRV reading of the day (typically 6am-10am).
 * This represents the recovery state after sleep.
 */
export function findMorningHRV(records: HealthRecord[]): { value: number; time: Date } | null {
  for (const r of records) {
    if (r.hrv !== null) {
      return { value: r.hrv, time: r.timestamp };
    }
  }
  return null;
}

/**
 * Find morning HRV for a specific day from the full days array.
 * Used for next-morning HRV comparison.
 */
export function findMorningHRVForDate(days: DayData[], date: string): { value: number; time: Date } | null {
  const day = days.find((d) => d.date === date);
  if (!day) return null;
  return findMorningHRV(day.records);
}

/**
 * Get the next day's date string from a given date.
 */
export function getNextDay(date: string): string {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
