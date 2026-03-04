import type { HealthRecord, SaunaSession } from './types';
import { computeRecoveryTime, findNearestHRV } from './hrAnalysis';

interface ElevatedWindow {
  startIdx: number;
  endIdx: number;
  peakHR: number;
  peakIdx: number;
}

const ELEVATION_THRESHOLD = 30; // bpm above baseline to flag as elevated
const MIN_PEAK_HR = 120; // minimum peak to qualify as sauna
const GAP_TOLERANCE_MINUTES = 15; // max gap between elevated readings to merge (sparse data)
const MIN_DURATION_MINUTES = 3; // minimum duration of elevated HR
const MAX_STEPS_PER_MINUTE = 120; // filter out running (150+/min) but allow sauna approach walking
const RAMP_WINDOW_MINUTES = 10; // look back for ramp-up before first spike

/**
 * Detect sauna sessions from a day's health records.
 *
 * Algorithm:
 * 1. Find all HR readings above baseline + threshold
 * 2. Group adjacent elevated readings (allowing gaps for sparse data)
 * 3. Filter by peak HR, duration, and low step count
 * 4. Expand window to include ramp-up and compute recovery
 */
export function detectSaunaSessions(
  records: HealthRecord[],
  baselineHR: number | null
): SaunaSession[] {
  if (baselineHR === null) return [];

  const elevationTarget = baselineHR + ELEVATION_THRESHOLD;

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
      // Extend current window
      windowEnd = idx;
      const hr = records[idx].heartRateAvg!;
      if (hr > peakHR) {
        peakHR = hr;
        peakIdx = idx;
      }
    } else {
      // Close current window, start new one
      windows.push({ startIdx: windowStart, endIdx: windowEnd, peakHR, peakIdx });
      windowStart = idx;
      windowEnd = idx;
      peakHR = records[idx].heartRateAvg!;
      peakIdx = idx;
    }
  }
  windows.push({ startIdx: windowStart, endIdx: windowEnd, peakHR, peakIdx });

  // Step 3: Filter windows
  const sessions: SaunaSession[] = [];

  for (const w of windows) {
    // Check peak HR
    if (w.peakHR < MIN_PEAK_HR) continue;

    // Check duration
    const durationMinutes =
      (records[w.endIdx].timestamp.getTime() -
        records[w.startIdx].timestamp.getTime()) /
      (1000 * 60);
    if (durationMinutes < MIN_DURATION_MINUTES) continue;

    // Check step count during window — sauna should have very few steps
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
    if (avgStepsPerMinute > MAX_STEPS_PER_MINUTE) continue;

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

    sessions.push({
      startTime: records[expandedStartIdx].timestamp,
      endTime: recovery?.endTime ?? records[w.endIdx].timestamp,
      peakHR: w.peakHR,
      peakTime: records[w.peakIdx].timestamp,
      recoveryMinutes: recovery?.minutes ?? null,
      recoveryEndTime: recovery?.endTime ?? null,
      preHRV,
      postHRV,
      elevationAboveBaseline: w.peakHR - baselineHR,
    });
  }

  return sessions;
}
