import type { HealthRecord, DetectedEvent, ActivityType } from './types';
import { computeRecoveryTime, findNearestHRV } from './hrAnalysis';

interface ElevatedWindow {
  startIdx: number;
  endIdx: number;
  peakHR: number;
  peakIdx: number;
}

// === High-intensity event thresholds (sauna, workout, cold plunge) ===
const ELEVATION_MULTIPLIER = 1.5;     // HR must exceed baseline * this to flag as elevated
const PEAK_MULTIPLIER = 1.9;          // peak must reach baseline * this to qualify as event
const GAP_TOLERANCE_MINUTES = 20;     // max gap between elevated readings to merge (sparse data)
const MIN_DURATION_MINUTES = 3;       // minimum duration of elevated HR
const RAMP_WINDOW_MINUTES = 10;       // look back for ramp-up before first spike

// === Walk detection thresholds ===
const WALK_MIN_HR = 80;               // minimum HR to consider (absolute, not relative)
const WALK_ELEVATION_BPM = 15;        // HR must be at least baseline + this
const WALK_MAX_HR_MULTIPLIER = 1.85;  // below this = not a high-intensity event
const WALK_MIN_DURATION = 10;         // must last at least 10 minutes
const WALK_MIN_STEPS = 500;           // must have substantial steps
const WALK_MIN_STEPS_PER_MIN = 30;    // must have consistent stepping
const WALK_GAP_TOLERANCE = 5;         // minutes gap allowed between elevated walk readings

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
 * Check if a time range overlaps with any existing events.
 */
function overlapsExisting(
  startTime: Date,
  endTime: Date,
  existing: DetectedEvent[]
): boolean {
  const s = startTime.getTime();
  const e = endTime.getTime();
  return existing.some((ev) => {
    const es = ev.startTime.getTime();
    const ee = ev.endTime.getTime();
    return s < ee && e > es;
  });
}

/**
 * Detect elevated HR events from a day's health records.
 *
 * Two-pass detection:
 * 1. High-intensity events (sauna, workout, cold plunge) — baseline-relative thresholds
 * 2. Walk events — moderate HR elevation with step count correlation
 */
export function detectEvents(
  records: HealthRecord[],
  baselineHR: number | null
): DetectedEvent[] {
  if (baselineHR === null) return [];

  // Pass 1: High-intensity events
  const highIntensityEvents = detectHighIntensityEvents(records, baselineHR);

  // Pass 2: Walk events (only in gaps not covered by high-intensity events)
  const walkEvents = detectWalkEvents(records, baselineHR, highIntensityEvents);

  return [...highIntensityEvents, ...walkEvents].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );
}

/**
 * Pass 1: Detect high-intensity events (sauna, workout, cold plunge).
 * Original algorithm with baseline-relative thresholds.
 */
function detectHighIntensityEvents(
  records: HealthRecord[],
  baselineHR: number
): DetectedEvent[] {
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
    if (w.peakHR < peakTarget) continue;

    const durationMinutes =
      (records[w.endIdx].timestamp.getTime() -
        records[w.startIdx].timestamp.getTime()) /
      (1000 * 60);
    if (durationMinutes < MIN_DURATION_MINUTES) continue;

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

    // Expand start to include ramp-up
    let expandedStartIdx = w.startIdx;
    const rampCutoff =
      records[w.startIdx].timestamp.getTime() - RAMP_WINDOW_MINUTES * 60 * 1000;
    for (let i = w.startIdx - 1; i >= 0; i--) {
      if (records[i].timestamp.getTime() < rampCutoff) break;
      if (records[i].heartRateAvg !== null && records[i].heartRateAvg! > baselineHR + 15) {
        expandedStartIdx = i;
      }
    }

    const recovery = computeRecoveryTime(
      records,
      records[w.peakIdx].timestamp,
      baselineHR
    );

    const preHRV = findNearestHRV(records, records[expandedStartIdx].timestamp, 120);
    const postHRV = findNearestHRV(
      records,
      recovery?.endTime ?? records[w.endIdx].timestamp,
      120
    );

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

/**
 * Pass 2: Detect walk events.
 *
 * Walks are moderate HR elevation (baseline+15 to ~1.85x baseline) with
 * consistent stepping (>30 steps/min), lasting >10 minutes.
 * Only detects in time windows not already covered by high-intensity events.
 */
function detectWalkEvents(
  records: HealthRecord[],
  baselineHR: number,
  existingEvents: DetectedEvent[]
): DetectedEvent[] {
  const walkThreshold = Math.max(WALK_MIN_HR, baselineHR + WALK_ELEVATION_BPM);
  const walkCeiling = baselineHR * WALK_MAX_HR_MULTIPLIER;

  // Find readings that look like walking: moderate HR, steps present
  const walkLike: number[] = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const hr = r.heartRateAvg;
    const steps = r.stepCount;
    if (
      hr !== null &&
      hr >= walkThreshold &&
      hr <= walkCeiling &&
      steps !== null &&
      steps > 0
    ) {
      walkLike.push(i);
    }
  }

  if (walkLike.length === 0) return [];

  // Group into contiguous windows
  const windows: ElevatedWindow[] = [];
  let wStart = walkLike[0];
  let wEnd = walkLike[0];
  let wPeakHR = records[walkLike[0]].heartRateAvg!;
  let wPeakIdx = walkLike[0];

  for (let i = 1; i < walkLike.length; i++) {
    const idx = walkLike[i];
    const prevIdx = walkLike[i - 1];
    const gap =
      (records[idx].timestamp.getTime() - records[prevIdx].timestamp.getTime()) /
      (1000 * 60);

    if (gap <= WALK_GAP_TOLERANCE) {
      wEnd = idx;
      const hr = records[idx].heartRateAvg!;
      if (hr > wPeakHR) {
        wPeakHR = hr;
        wPeakIdx = idx;
      }
    } else {
      windows.push({ startIdx: wStart, endIdx: wEnd, peakHR: wPeakHR, peakIdx: wPeakIdx });
      wStart = idx;
      wEnd = idx;
      wPeakHR = records[idx].heartRateAvg!;
      wPeakIdx = idx;
    }
  }
  windows.push({ startIdx: wStart, endIdx: wEnd, peakHR: wPeakHR, peakIdx: wPeakIdx });

  const events: DetectedEvent[] = [];

  for (const w of windows) {
    const startTime = records[w.startIdx].timestamp;
    const endTime = records[w.endIdx].timestamp;
    const durationMinutes =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60);

    if (durationMinutes < WALK_MIN_DURATION) continue;

    // Skip if overlaps with an existing high-intensity event
    if (overlapsExisting(startTime, endTime, existingEvents)) continue;

    // Compute steps
    let totalSteps = 0;
    let activeEnergyKJ = 0;
    for (let i = w.startIdx; i <= w.endIdx; i++) {
      if (records[i].stepCount !== null) totalSteps += records[i].stepCount!;
      if (records[i].activeEnergy !== null) activeEnergyKJ += records[i].activeEnergy!;
    }

    if (totalSteps < WALK_MIN_STEPS) continue;

    const avgStepsPerMinute = totalSteps / Math.max(durationMinutes, 1);
    if (avgStepsPerMinute < WALK_MIN_STEPS_PER_MIN) continue;

    // Find HRV context
    const preHRV = findNearestHRV(records, startTime, 120);
    const postHRV = findNearestHRV(records, endTime, 120);
    const hrvChangePercent =
      preHRV !== null && postHRV !== null && preHRV > 0
        ? Math.round(((postHRV - preHRV) / preHRV) * 100)
        : null;

    events.push({
      id: formatDateId(startTime),
      startTime,
      endTime,
      peakHR: w.peakHR,
      peakTime: records[w.peakIdx].timestamp,
      durationMinutes: Math.round(durationMinutes),
      recoveryMinutes: null, // walks don't need recovery tracking
      recoveryEndTime: null,
      preHRV,
      postHRV,
      elevationAboveBaseline: w.peakHR - baselineHR,
      activeEnergyKJ,
      totalSteps: Math.round(totalSteps),
      hrvChangePercent,
      avgStepsPerMinute: Math.round(avgStepsPerMinute),
      label: null,
      confirmed: false,
      dismissed: false,
      suggestedLabel: 'walk',
    });
  }

  return events;
}
