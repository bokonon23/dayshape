import type { HealthRecord, DetectedEvent, ActivityType } from './types';
import { computeRecoveryTime, findNearestHRV } from './hrAnalysis';

interface ElevatedWindow {
  startIdx: number;
  endIdx: number;
  peakHR: number;
  peakIdx: number;
}

// Baseline-relative thresholds
const ELEVATION_MULTIPLIER = 1.5;     // HR must exceed baseline * this to flag as elevated
const PEAK_MULTIPLIER = 1.9;          // peak must reach baseline * this to qualify as event
const GAP_TOLERANCE_MINUTES = 20;     // max gap between elevated readings to merge (sparse data)
const MIN_DURATION_MINUTES = 3;       // minimum duration of elevated HR
const RAMP_WINDOW_MINUTES = 10;       // look back for ramp-up before first spike

function formatDateId(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}_${d.getTime()}`;
}

function suggestLabel(
  avgStepsPerMinute: number,
  peakHR: number,
  baselineHR: number,
  durationMinutes: number
): ActivityType {
  if (avgStepsPerMinute > 80) {
    return peakHR > baselineHR * 2.5 ? 'workout' : 'walk';
  }
  if (durationMinutes < 5) {
    return 'cold_plunge';
  }
  return 'sauna';
}

/**
 * Detect elevated HR events from a day's health records using baseline-relative thresholds.
 *
 * Algorithm:
 * 1. Find all HR readings above baseline * ELEVATION_MULTIPLIER
 * 2. Group adjacent elevated readings (allowing gaps for sparse data)
 * 3. Filter by peak HR (must reach baseline * PEAK_MULTIPLIER), duration
 * 4. Expand window to include ramp-up and compute recovery
 * 5. Suggest an activity label based on steps, peak HR, duration
 */
export function detectEvents(
  records: HealthRecord[],
  baselineHR: number | null
): DetectedEvent[] {
  if (baselineHR === null) return [];

  const elevationTarget = baselineHR * ELEVATION_MULTIPLIER;
  const peakTarget = baselineHR * PEAK_MULTIPLIER;

  // Step 1: Find elevated readings
  const elevated: number[] = [];
  for (let i = 0; i < records.length; i++) {
    const hr = records[i].heartRateAvg;
    if (hr !== null && hr >= elevationTarget) {
      elevated.push(i);
    }
  }

  if (elevated.length === 0) return [];

  // Step 2: Group into contiguous windows (allowing gaps)
  const windows: ElevatedWindow[] = [];
  let windowStart = elevated[0];
  let windowEnd = elevated[0];
  let peakHR = records[elevated[0]].heartRateAvg!;
  let peakIdx = elevated[0];

  for (let i = 1; i < elevated.length; i++) {
    const idx = elevated[i];
    const prevIdx = elevated[i - 1];
    const gapMinutes =
      (records[idx].timestamp.getTime() -
        records[prevIdx].timestamp.getTime()) /
      (1000 * 60);

    if (gapMinutes <= GAP_TOLERANCE_MINUTES) {
      windowEnd = idx;
      const hr = records[idx].heartRateAvg!;
      if (hr > peakHR) {
        peakHR = hr;
        peakIdx = idx;
      }
    } else {
      windows.push({ startIdx: windowStart, endIdx: windowEnd, peakHR, peakIdx });
      windowStart = idx;
      windowEnd = idx;
      peakHR = records[idx].heartRateAvg!;
      peakIdx = idx;
    }
  }
  windows.push({ startIdx: windowStart, endIdx: windowEnd, peakHR, peakIdx });

  // Step 3: Filter windows and build events
  const events: DetectedEvent[] = [];

  for (const w of windows) {
    // Check peak HR against baseline-relative threshold
    if (w.peakHR < peakTarget) continue;

    // Check duration
    const durationMinutes =
      (records[w.endIdx].timestamp.getTime() -
        records[w.startIdx].timestamp.getTime()) /
      (1000 * 60);
    if (durationMinutes < MIN_DURATION_MINUTES) continue;

    // Compute steps during window
    let totalSteps = 0;
    let stepReadings = 0;
    for (let i = w.startIdx; i <= w.endIdx; i++) {
      if (records[i].stepCount !== null) {
        totalSteps += records[i].stepCount!;
        stepReadings++;
      }
    }
    const avgStepsPerMinute =
      stepReadings > 0 ? totalSteps / Math.max(durationMinutes, 1) : 0;

    // Step 4: Expand start to include ramp-up
    let expandedStartIdx = w.startIdx;
    const rampCutoff =
      records[w.startIdx].timestamp.getTime() - RAMP_WINDOW_MINUTES * 60 * 1000;
    for (let i = w.startIdx - 1; i >= 0; i--) {
      if (records[i].timestamp.getTime() < rampCutoff) break;
      if (records[i].heartRateAvg !== null && records[i].heartRateAvg! > baselineHR + 15) {
        expandedStartIdx = i;
      }
    }

    // Compute recovery
    const recovery = computeRecoveryTime(
      records,
      records[w.peakIdx].timestamp,
      baselineHR
    );

    // Find HRV before and after
    const preHRV = findNearestHRV(records, records[expandedStartIdx].timestamp, 120);
    const postHRV = findNearestHRV(
      records,
      recovery?.endTime ?? records[w.endIdx].timestamp,
      120
    );

    // Compute active energy and steps during session window
    const sessionEndIdx = recovery
      ? records.findIndex((r) => r.timestamp.getTime() >= recovery.endTime.getTime())
      : w.endIdx;
    const endIdx = sessionEndIdx >= 0 ? sessionEndIdx : w.endIdx;

    let activeEnergyKJ = 0;
    let sessionSteps = 0;
    for (let i = expandedStartIdx; i <= endIdx; i++) {
      if (records[i].activeEnergy !== null) activeEnergyKJ += records[i].activeEnergy!;
      if (records[i].stepCount !== null) sessionSteps += records[i].stepCount!;
    }

    const hrvChangePercent =
      preHRV !== null && postHRV !== null && preHRV > 0
        ? Math.round(((postHRV - preHRV) / preHRV) * 100)
        : null;

    const suggested = suggestLabel(avgStepsPerMinute, w.peakHR, baselineHR, durationMinutes);

    events.push({
      id: formatDateId(records[expandedStartIdx].timestamp),
      startTime: records[expandedStartIdx].timestamp,
      endTime: recovery?.endTime ?? records[w.endIdx].timestamp,
      peakHR: w.peakHR,
      peakTime: records[w.peakIdx].timestamp,
      durationMinutes: Math.round(durationMinutes),
      recoveryMinutes: recovery?.minutes ?? null,
      recoveryEndTime: recovery?.endTime ?? null,
      preHRV,
      postHRV,
      elevationAboveBaseline: w.peakHR - baselineHR,
      activeEnergyKJ,
      totalSteps: Math.round(sessionSteps),
      hrvChangePercent,
      avgStepsPerMinute: Math.round(avgStepsPerMinute),
      label: null,
      confirmed: false,
      dismissed: false,
      suggestedLabel: suggested,
    });
  }

  return events;
}
