import type { DayData, DetectedEvent, DayNotes, DaySummary, ConfirmedEventSummary } from './types';

export function computeDaySummary(
  day: DayData,
  events: DetectedEvent[],
  notes: DayNotes | null
): DaySummary {
  let totalSteps = 0;
  let totalActiveEnergyKJ = 0;
  let totalDistance = 0;
  let hasDistance = false;

  const hrvValues: number[] = [];
  let sleepTotal: number | null = null;
  let sleepDeep: number | null = null;
  let sleepREM: number | null = null;

  for (const r of day.records) {
    if (r.stepCount !== null) totalSteps += r.stepCount;
    if (r.activeEnergy !== null) totalActiveEnergyKJ += r.activeEnergy;
    if (r.walkingDistance !== null) {
      totalDistance += r.walkingDistance;
      hasDistance = true;
    }
    if (r.hrv !== null) hrvValues.push(r.hrv);

    // Sleep data is typically populated on one row per day — take first non-null
    if (sleepTotal === null && r.sleepTotal !== null) sleepTotal = r.sleepTotal;
    if (sleepDeep === null && r.sleepDeep !== null) sleepDeep = r.sleepDeep;
    if (sleepREM === null && r.sleepREM !== null) sleepREM = r.sleepREM;
  }

  const avgHRV = hrvValues.length > 0
    ? hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length
    : null;
  const minHRV = hrvValues.length > 0 ? Math.min(...hrvValues) : null;
  const maxHRV = hrvValues.length > 0 ? Math.max(...hrvValues) : null;

  const confirmedEvents: ConfirmedEventSummary[] = events
    .filter((e) => e.confirmed && !e.dismissed && e.label !== null)
    .map((e) => ({
      label: e.label!,
      startTime: e.startTime.toISOString(),
      peakHR: e.peakHR,
      durationMinutes: e.durationMinutes,
      recoveryMinutes: e.recoveryMinutes,
      preHRV: e.preHRV,
      postHRV: e.postHRV,
      hrvChangePercent: e.hrvChangePercent,
    }));

  return {
    date: day.date,
    baselineHR: day.baselineHR,
    avgHRV: avgHRV !== null ? Math.round(avgHRV * 10) / 10 : null,
    minHRV,
    maxHRV,
    totalSteps: Math.round(totalSteps),
    totalActiveEnergyKJ: Math.round(totalActiveEnergyKJ),
    totalDistance: hasDistance ? Math.round(totalDistance * 100) / 100 : null,
    sleepTotal,
    sleepDeep,
    sleepREM,
    events: confirmedEvents,
    notes,
  };
}
