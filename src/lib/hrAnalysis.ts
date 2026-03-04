import type { HealthRecord, DayData, ChartDataPoint } from './types';

/**
 * Compute baseline HR: mean of non-null HR readings between 00:00–06:00.
 */
export function computeBaselineHR(records: HealthRecord[]): number | null {
  const nightReadings = records.filter((r) => {
    const h = r.timestamp.getHours();
    return h < 6 && r.heartRateAvg !== null;
  });

  if (nightReadings.length === 0) return null;

  const sum = nightReadings.reduce((acc, r) => acc + r.heartRateAvg!, 0);
  return Math.round(sum / nightReadings.length);
}

/**
 * Compute recovery time in minutes from a peak timestamp back to baseline + margin.
 * Scans forward from peakTime until HR drops to (baselineHR + margin).
 * Returns null if HR never recovers within the data.
 */
export function computeRecoveryTime(
  records: HealthRecord[],
  peakTime: Date,
  baselineHR: number,
  margin: number = 10
): { minutes: number; endTime: Date } | null {
  const target = baselineHR + margin;
  const peakMs = peakTime.getTime();

  for (const r of records) {
    if (r.timestamp.getTime() <= peakMs) continue;
    if (r.heartRateAvg === null) continue;
    if (r.heartRateAvg <= target) {
      const minutes = Math.round(
        (r.timestamp.getTime() - peakMs) / (1000 * 60)
      );
      return { minutes, endTime: r.timestamp };
    }
  }

  return null;
}

/**
 * Find the nearest HRV reading to a given timestamp within a window.
 */
export function findNearestHRV(
  records: HealthRecord[],
  targetTime: Date,
  windowMinutes: number = 60
): number | null {
  const targetMs = targetTime.getTime();
  const windowMs = windowMinutes * 60 * 1000;

  let closest: { hrv: number; distance: number } | null = null;

  for (const r of records) {
    if (r.hrv === null) continue;
    const distance = Math.abs(r.timestamp.getTime() - targetMs);
    if (distance > windowMs) continue;
    if (closest === null || distance < closest.distance) {
      closest = { hrv: r.hrv, distance };
    }
  }

  return closest?.hrv ?? null;
}

/**
 * Enrich a DayData with computed baseline HR.
 */
export function enrichDayData(day: DayData): DayData {
  return {
    ...day,
    baselineHR: computeBaselineHR(day.records),
  };
}

/**
 * Convert records into chart-friendly data points.
 * Only includes records that have at least HR or HRV data.
 */
export function toChartData(records: HealthRecord[]): ChartDataPoint[] {
  return records
    .filter((r) => r.heartRateAvg !== null || r.hrv !== null)
    .map((r) => {
      const h = r.timestamp.getHours();
      const m = r.timestamp.getMinutes();
      return {
        time: h * 60 + m,
        timeLabel: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        heartRate: r.heartRateAvg,
        hrv: r.hrv,
      };
    });
}
