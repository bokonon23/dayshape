import Papa from 'papaparse';
import type { HealthRecord, DayData } from './types';

const COLUMN_MAP = {
  dateTime: 'Date/Time',
  heartRateAvg: 'Heart Rate [Avg] (count/min)',
  heartRateMin: 'Heart Rate [Min] (count/min)',
  heartRateMax: 'Heart Rate [Max] (count/min)',
  hrv: 'Heart Rate Variability (ms)',
  stepCount: 'Step Count (count)',
  activeEnergy: 'Active Energy (kJ)',
  restingHeartRate: 'Resting Heart Rate (count/min)',
  respiratoryRate: 'Respiratory Rate (count/min)',
  sleepTotal: 'Sleep Analysis [Total] (hr)',
  sleepAsleep: 'Sleep Analysis [Asleep] (hr)',
  sleepCore: 'Sleep Analysis [Core] (hr)',
  sleepDeep: 'Sleep Analysis [Deep] (hr)',
  sleepREM: 'Sleep Analysis [REM] (hr)',
  sleepAwake: 'Sleep Analysis [Awake] (hr)',
  bloodOxygen: 'Blood Oxygen Saturation (%)',
  walkingDistance: 'Walking + Running Distance (km)',
} as const;

function parseDateTime(raw: string): Date | null {
  // Format: DD/MM/YYYY HH:MM
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hours, minutes] = match;
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes)
  );
}

function parseNum(val: string | undefined | null): number | null {
  if (val === undefined || val === null || val === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseCSV(csvText: string): DayData[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const recordsByDay = new Map<string, HealthRecord[]>();

  for (const row of result.data) {
    const rawDate = row[COLUMN_MAP.dateTime];
    if (!rawDate) continue;

    const timestamp = parseDateTime(rawDate.trim());
    if (!timestamp) continue;

    const record: HealthRecord = {
      timestamp,
      heartRateAvg: parseNum(row[COLUMN_MAP.heartRateAvg]),
      heartRateMin: parseNum(row[COLUMN_MAP.heartRateMin]),
      heartRateMax: parseNum(row[COLUMN_MAP.heartRateMax]),
      hrv: parseNum(row[COLUMN_MAP.hrv]),
      stepCount: parseNum(row[COLUMN_MAP.stepCount]),
      activeEnergy: parseNum(row[COLUMN_MAP.activeEnergy]),
      restingHeartRate: parseNum(row[COLUMN_MAP.restingHeartRate]),
      respiratoryRate: parseNum(row[COLUMN_MAP.respiratoryRate]),
      sleepTotal: parseNum(row[COLUMN_MAP.sleepTotal]),
      sleepAsleep: parseNum(row[COLUMN_MAP.sleepAsleep]),
      sleepCore: parseNum(row[COLUMN_MAP.sleepCore]),
      sleepDeep: parseNum(row[COLUMN_MAP.sleepDeep]),
      sleepREM: parseNum(row[COLUMN_MAP.sleepREM]),
      sleepAwake: parseNum(row[COLUMN_MAP.sleepAwake]),
      bloodOxygen: parseNum(row[COLUMN_MAP.bloodOxygen]),
      walkingDistance: parseNum(row[COLUMN_MAP.walkingDistance]),
    };

    const key = toDateKey(timestamp);
    if (!recordsByDay.has(key)) {
      recordsByDay.set(key, []);
    }
    recordsByDay.get(key)!.push(record);
  }

  const days: DayData[] = [];
  for (const [date, records] of recordsByDay) {
    records.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    days.push({ date, records, baselineHR: null });
  }

  days.sort((a, b) => a.date.localeCompare(b.date));
  return days;
}
