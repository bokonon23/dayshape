/**
 * Generate realistic demo CSV data for DayShape.
 *
 * Creates 22 days of per-minute health records with:
 * - Circadian HR pattern (low night, morning rise, daytime variability)
 * - Sauna sessions: 2-3x/week, HR 120-155, ~15 min, zero steps
 * - Walk sessions: 2-3x/week, HR 85-110, 20-40 min, 80-120 steps/min
 * - HRV readings: every 15-60 min, inversely correlated with HR
 * - Sleep data: every night, realistic stage distributions
 * - Step data: scattered throughout waking hours
 * - Walking distance during walks
 *
 * Output: CSV matching Health Auto Export format
 *
 * Run: npx tsx scripts/generateDemoData.ts > public/sample-data.csv
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const START_DATE = new Date(2026, 1, 11); // Feb 11 2026
const NUM_DAYS = 22;
const BASELINE_HR = 68; // resting HR

// Seeded random for reproducibility
let seed = 42;
function rand(): number {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number): number {
  return min + rand() * (max - min);
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface MinuteRecord {
  hrAvg: number | null;
  hrMin: number | null;
  hrMax: number | null;
  hrv: number | null;
  stepCount: number | null;
  activeEnergy: number | null;
  restingHR: number | null;
  respiratoryRate: number | null;
  sleepTotal: number | null;
  sleepAsleep: number | null;
  sleepCore: number | null;
  sleepDeep: number | null;
  sleepREM: number | null;
  sleepAwake: number | null;
  bloodOxygen: number | null;
  walkingDistance: number | null;
}

interface ScheduledEvent {
  type: 'sauna' | 'walk' | 'workout';
  startMinute: number; // minute of day (0-1439)
  durationMinutes: number;
}

// ─── Circadian HR model ─────────────────────────────────────────────────────

/**
 * Base HR for a given minute of the day (0-1439).
 * Models circadian rhythm: lowest at ~3-4am, rises ~6am, peaks late morning,
 * moderate afternoon, gradual decline evening.
 */
function circadianHR(minute: number): number {
  const hour = minute / 60;

  if (hour < 5) {
    // Deep night: slightly below baseline (Apple Watch baseline ~ nighttime avg)
    return BASELINE_HR - 4 + Math.sin((hour / 5) * Math.PI) * 2;
  } else if (hour < 7) {
    // Wake-up ramp
    const t = (hour - 5) / 2;
    return BASELINE_HR - 4 + t * 10;
  } else if (hour < 12) {
    // Morning: active, slightly elevated
    return BASELINE_HR + 5 + Math.sin(((hour - 7) / 5) * Math.PI) * 4;
  } else if (hour < 14) {
    // Post-lunch dip
    return BASELINE_HR + 2;
  } else if (hour < 18) {
    // Afternoon: moderate
    return BASELINE_HR + 4 + Math.sin(((hour - 14) / 4) * Math.PI) * 3;
  } else if (hour < 22) {
    // Evening wind-down
    const t = (hour - 18) / 4;
    return BASELINE_HR + 4 - t * 10;
  } else {
    // Late night, heading to sleep
    const t = (hour - 22) / 2;
    return BASELINE_HR - 6 - t * 4;
  }
}

// ─── Event scheduling ────────────────────────────────────────────────────────

function scheduleEvents(dayIndex: number, dayOfWeek: number): ScheduledEvent[] {
  const events: ScheduledEvent[] = [];

  // Saunas: typically Mon, Wed, Fri or Tue, Thu, Sat
  // ~2-3 per week, usually late morning or early afternoon
  const saunaDays = [1, 3, 5]; // Mon, Wed, Fri
  if (saunaDays.includes(dayOfWeek) && rand() > 0.15) {
    const startHour = randInt(10, 13);
    const startMin = startHour * 60 + randInt(0, 30);
    events.push({
      type: 'sauna',
      startMinute: startMin,
      durationMinutes: randInt(12, 20),
    });

    // Sometimes a second sauna session 30-60 min later
    if (rand() > 0.6) {
      const gap = randInt(30, 60);
      events.push({
        type: 'sauna',
        startMinute: startMin + events[0].durationMinutes + gap,
        durationMinutes: randInt(10, 16),
      });
    }
  }

  // Walks: typically 2-3 per week, morning or afternoon
  const walkDays = [0, 2, 4, 6]; // Sun, Tue, Thu, Sat
  if (walkDays.includes(dayOfWeek) && rand() > 0.2) {
    // Morning walk
    const walkStart = randInt(7, 9) * 60 + randInt(0, 30);
    events.push({
      type: 'walk',
      startMinute: walkStart,
      durationMinutes: randInt(20, 45),
    });
  }

  // Occasional afternoon walk on any day
  if (rand() > 0.75) {
    const walkStart = randInt(15, 17) * 60 + randInt(0, 30);
    // Make sure doesn't overlap with existing events
    const overlaps = events.some(
      (e) =>
        walkStart < e.startMinute + e.durationMinutes + 30 &&
        walkStart + 30 > e.startMinute - 30
    );
    if (!overlaps) {
      events.push({
        type: 'walk',
        startMinute: walkStart,
        durationMinutes: randInt(15, 35),
      });
    }
  }

  return events;
}

// ─── Sleep generation ────────────────────────────────────────────────────────

interface SleepData {
  total: number;
  asleep: number;
  core: number;
  deep: number;
  rem: number;
  awake: number;
  bedtimeMinute: number; // minute of day when sleep started (e.g. 1380 = 23:00)
  wakeMinute: number; // minute of day when woke up
}

function generateSleep(): SleepData {
  const totalHours = randFloat(6.0, 9.0);
  const awakeHours = randFloat(0.2, 0.6);
  const asleepHours = totalHours - awakeHours;

  // Realistic stage distribution
  const deepPct = randFloat(0.08, 0.22); // 8-22% deep
  const remPct = randFloat(0.18, 0.28); // 18-28% REM
  const corePct = 1 - deepPct - remPct; // remainder is core

  const deep = asleepHours * deepPct;
  const rem = asleepHours * remPct;
  const core = asleepHours * corePct;

  const bedtimeMinute = randInt(22, 23) * 60 + randInt(0, 45); // 22:00-23:45
  const wakeMinute = randInt(6, 7) * 60 + randInt(0, 45); // 6:00-7:45

  return {
    total: Math.round(totalHours * 100) / 100,
    asleep: Math.round(asleepHours * 100) / 100,
    core: Math.round(core * 100) / 100,
    deep: Math.round(deep * 100) / 100,
    rem: Math.round(rem * 100) / 100,
    awake: Math.round(awakeHours * 100) / 100,
    bedtimeMinute,
    wakeMinute,
  };
}

// ─── HR during events ────────────────────────────────────────────────────────

function saunaHR(minuteIntoSession: number, duration: number): number {
  // Ramp up over first 3-4 min, plateau, slight rise
  const t = minuteIntoSession / duration;
  if (t < 0.2) {
    // Ramp up
    return BASELINE_HR + 20 + (t / 0.2) * 55;
  } else if (t < 0.8) {
    // Plateau with slight rise
    return BASELINE_HR + 75 + (t - 0.2) * 20 + randFloat(-3, 3);
  } else {
    // Final push
    return BASELINE_HR + 80 + (t - 0.8) * 30 + randFloat(-2, 2);
  }
}

function walkHR(minuteIntoSession: number, duration: number): number {
  // Gentle ramp up over 3-5 min, steady state, cool down at end
  const t = minuteIntoSession / duration;
  if (t < 0.1) {
    // Ramp up
    return BASELINE_HR + 5 + (t / 0.1) * 25;
  } else if (t < 0.85) {
    // Steady walking
    return BASELINE_HR + 25 + randFloat(-5, 8);
  } else {
    // Winding down
    const coolT = (t - 0.85) / 0.15;
    return BASELINE_HR + 25 - coolT * 15 + randFloat(-3, 3);
  }
}

// ─── Recovery HR after events ────────────────────────────────────────────────

function recoveryHR(
  minutesAfterEvent: number,
  peakHR: number,
  eventType: 'sauna' | 'walk' | 'workout'
): number | null {
  const recoveryDuration = eventType === 'sauna' ? 45 : 20; // minutes
  if (minutesAfterEvent > recoveryDuration) return null;

  const t = minutesAfterEvent / recoveryDuration;
  const delta = peakHR - BASELINE_HR;
  // Exponential-ish decay
  return BASELINE_HR + delta * Math.exp(-3 * t) + randFloat(-2, 2);
}

// ─── HRV model ───────────────────────────────────────────────────────────────

function baseHRV(minute: number, isSleeping: boolean): number {
  if (isSleeping) {
    // Higher HRV during sleep
    return randFloat(35, 65);
  }
  // Daytime: inversely correlated with activity/stress
  const hour = minute / 60;
  if (hour < 8) return randFloat(30, 50); // morning, moderate
  if (hour < 12) return randFloat(20, 40); // active morning
  if (hour < 14) return randFloat(25, 45); // post-lunch
  if (hour < 18) return randFloat(20, 38); // afternoon
  return randFloat(28, 48); // evening, relaxing
}

// ─── Main generator ──────────────────────────────────────────────────────────

const COLUMNS = [
  'Date/Time',
  'Active Energy (kJ)',
  'Heart Rate [Min] (count/min)',
  'Heart Rate [Max] (count/min)',
  'Heart Rate [Avg] (count/min)',
  'Heart Rate Variability (ms)',
  'Resting Heart Rate (count/min)',
  'Respiratory Rate (count/min)',
  'Sleep Analysis [Total] (hr)',
  'Sleep Analysis [Asleep] (hr)',
  'Sleep Analysis [Core] (hr)',
  'Sleep Analysis [Deep] (hr)',
  'Sleep Analysis [REM] (hr)',
  'Sleep Analysis [Awake] (hr)',
  'Blood Oxygen Saturation (%)',
  'Step Count (count)',
  'Walking + Running Distance (km)',
];

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function csvRow(dateStr: string, rec: MinuteRecord): string {
  const vals = [
    dateStr,
    rec.activeEnergy !== null ? rec.activeEnergy.toFixed(2) : '',
    rec.hrMin !== null ? Math.round(rec.hrMin).toString() : '',
    rec.hrMax !== null ? Math.round(rec.hrMax).toString() : '',
    rec.hrAvg !== null ? Math.round(rec.hrAvg).toString() : '',
    rec.hrv !== null ? Math.round(rec.hrv).toString() : '',
    rec.restingHR !== null ? Math.round(rec.restingHR).toString() : '',
    rec.respiratoryRate !== null ? rec.respiratoryRate.toFixed(1) : '',
    rec.sleepTotal !== null ? rec.sleepTotal.toFixed(2) : '',
    rec.sleepAsleep !== null ? rec.sleepAsleep.toFixed(2) : '',
    rec.sleepCore !== null ? rec.sleepCore.toFixed(2) : '',
    rec.sleepDeep !== null ? rec.sleepDeep.toFixed(2) : '',
    rec.sleepREM !== null ? rec.sleepREM.toFixed(2) : '',
    rec.sleepAwake !== null ? rec.sleepAwake.toFixed(2) : '',
    rec.bloodOxygen !== null ? rec.bloodOxygen.toFixed(0) : '',
    rec.stepCount !== null ? Math.round(rec.stepCount).toString() : '',
    rec.walkingDistance !== null ? rec.walkingDistance.toFixed(3) : '',
  ];
  return vals.join(',');
}

function emptyRecord(): MinuteRecord {
  return {
    hrAvg: null, hrMin: null, hrMax: null, hrv: null,
    stepCount: null, activeEnergy: null, restingHR: null,
    respiratoryRate: null, sleepTotal: null, sleepAsleep: null,
    sleepCore: null, sleepDeep: null, sleepREM: null,
    sleepAwake: null, bloodOxygen: null, walkingDistance: null,
  };
}

function generate(): string {
  const lines: string[] = [COLUMNS.join(',')];

  for (let dayIdx = 0; dayIdx < NUM_DAYS; dayIdx++) {
    const date = new Date(START_DATE);
    date.setDate(date.getDate() + dayIdx);
    const dayOfWeek = date.getDay(); // 0=Sun

    const sleep = generateSleep();
    const events = scheduleEvents(dayIdx, dayOfWeek);

    // Day-level variation: some days have slightly higher/lower baseline
    const dayBaselineOffset = randFloat(-3, 3);
    const dayBaseline = BASELINE_HR + dayBaselineOffset;

    // Track event windows for recovery
    const eventWindows: Array<{
      start: number;
      end: number;
      peakHR: number;
      type: 'sauna' | 'walk' | 'workout';
    }> = [];

    // Pre-compute event info
    for (const ev of events) {
      let peakHR = 0;
      for (let m = 0; m < ev.durationMinutes; m++) {
        let hr: number;
        if (ev.type === 'sauna') {
          hr = saunaHR(m, ev.durationMinutes);
        } else {
          hr = walkHR(m, ev.durationMinutes);
        }
        if (hr > peakHR) peakHR = hr;
      }
      eventWindows.push({
        start: ev.startMinute,
        end: ev.startMinute + ev.durationMinutes,
        peakHR,
        type: ev.type,
      });
    }

    // Sleep data row at 00:00
    {
      const rec = emptyRecord();
      rec.sleepTotal = sleep.total;
      rec.sleepAsleep = sleep.asleep;
      rec.sleepCore = sleep.core;
      rec.sleepDeep = sleep.deep;
      rec.sleepREM = sleep.rem;
      rec.sleepAwake = sleep.awake;
      rec.restingHR = Math.round(dayBaseline);
      const ts = new Date(date);
      ts.setHours(0, 0, 0, 0);
      lines.push(csvRow(formatDate(ts), rec));
    }

    // Generate per-minute records for waking hours
    // Sleep window: bedtime (prev night) to wake time
    // We generate from ~wake time to ~bedtime
    const wakeMinute = sleep.wakeMinute;
    const bedtimeMinute = sleep.bedtimeMinute;

    // Also generate some sleeping hours for HR and HRV context
    const genStart = 0; // midnight
    const genEnd = 1440; // full day

    // Determine which minutes have HR readings
    // Real Apple Watch: HR roughly every 5-10 minutes at rest, every minute during activity
    let lastHRVMinute = -30; // track for HRV spacing

    for (let minute = genStart; minute < genEnd; minute++) {
      const isSleeping =
        minute < wakeMinute || minute >= bedtimeMinute;

      // Determine if we emit a record for this minute
      let emitHR = false;
      let inEvent: ScheduledEvent | null = null;
      let inRecovery: {
        minutesAfter: number;
        peakHR: number;
        type: 'sauna' | 'walk' | 'workout';
      } | null = null;

      // Check if in an event
      for (const ev of events) {
        if (minute >= ev.startMinute && minute < ev.startMinute + ev.durationMinutes) {
          inEvent = ev;
          break;
        }
      }

      // Check if in recovery after an event
      if (!inEvent) {
        for (const ew of eventWindows) {
          const minsAfter = minute - ew.end;
          if (minsAfter >= 0 && minsAfter <= 50) {
            inRecovery = { minutesAfter: minsAfter, peakHR: ew.peakHR, type: ew.type };
            break;
          }
        }
      }

      // During events and recovery: every minute
      if (inEvent || inRecovery) {
        emitHR = true;
      } else if (isSleeping) {
        // During sleep: every 5-15 minutes
        emitHR = minute % randInt(5, 10) === 0;
      } else {
        // Awake rest: every 3-8 minutes
        emitHR = minute % randInt(3, 7) === 0;
      }

      if (!emitHR) continue;

      const rec = emptyRecord();
      const ts = new Date(date);
      ts.setHours(0, minute, 0, 0);

      // Heart rate
      let hr: number;
      if (inEvent) {
        const mInto = minute - inEvent.startMinute;
        if (inEvent.type === 'sauna') {
          hr = saunaHR(mInto, inEvent.durationMinutes);
        } else {
          hr = walkHR(mInto, inEvent.durationMinutes);
        }
      } else if (inRecovery) {
        const recHR = recoveryHR(inRecovery.minutesAfter, inRecovery.peakHR, inRecovery.type);
        hr = recHR ?? circadianHR(minute) + dayBaselineOffset + randFloat(-3, 3);
      } else if (isSleeping) {
        hr = BASELINE_HR - 4 + randFloat(-3, 3) + dayBaselineOffset;
      } else {
        hr = circadianHR(minute) + dayBaselineOffset + randFloat(-4, 4);
      }

      hr = Math.max(45, Math.min(175, hr));
      rec.hrAvg = hr;
      rec.hrMin = hr - randFloat(0, 3);
      rec.hrMax = hr + randFloat(0, 4);

      // Steps during walks
      if (inEvent && inEvent.type === 'walk') {
        const mInto = minute - inEvent.startMinute;
        const t = mInto / inEvent.durationMinutes;
        let stepsPerMin: number;
        if (t < 0.1) {
          stepsPerMin = 40 + t / 0.1 * 60; // ramp up
        } else if (t > 0.9) {
          stepsPerMin = 100 - ((t - 0.9) / 0.1) * 50; // slow down
        } else {
          stepsPerMin = randFloat(85, 120); // steady walking
        }
        rec.stepCount = Math.round(stepsPerMin);
        rec.walkingDistance = stepsPerMin * 0.75 / 1000; // ~0.75m per step, in km
        rec.activeEnergy = randFloat(8, 18);
      } else if (!isSleeping && !inEvent) {
        // Occasional background steps during waking hours (fidgeting, short movements)
        if (rand() > 0.6) {
          rec.stepCount = randInt(2, 25);
          rec.activeEnergy = randFloat(0.5, 4);
        }
      }

      // Active energy during sauna (no steps but elevated energy expenditure)
      if (inEvent && inEvent.type === 'sauna') {
        rec.activeEnergy = randFloat(3, 8);
        rec.stepCount = 0;
      }

      // HRV: every 15-45 minutes, more frequent during sleep and post-activity
      const hrvInterval = isSleeping ? randInt(10, 20) : inRecovery ? 8 : randInt(15, 40);
      if (minute - lastHRVMinute >= hrvInterval) {
        let hrvVal: number;
        if (inEvent) {
          // Suppressed during activity
          hrvVal = randFloat(8, 18);
        } else if (inRecovery && inRecovery.minutesAfter < 20) {
          // Post-activity: gradually recovering
          const t = inRecovery.minutesAfter / 20;
          hrvVal = 12 + t * 20 + randFloat(-3, 5);
        } else {
          hrvVal = baseHRV(minute, isSleeping);
        }
        rec.hrv = Math.max(5, Math.round(hrvVal));
        lastHRVMinute = minute;
      }

      // Resting HR: once per day, already set at 00:00 row
      // Respiratory rate: occasionally during sleep
      if (isSleeping && rand() > 0.85) {
        rec.respiratoryRate = randFloat(12, 18);
      }

      // Blood oxygen: occasionally during sleep
      if (isSleeping && rand() > 0.9) {
        rec.bloodOxygen = randFloat(95, 99);
      }

      lines.push(csvRow(formatDate(ts), rec));
    }
  }

  return lines.join('\n');
}

// ─── Run ─────────────────────────────────────────────────────────────────────

const csv = generate();
process.stdout.write(csv);
