export interface HealthRecord {
  timestamp: Date;
  heartRateAvg: number | null;
  heartRateMin: number | null;
  heartRateMax: number | null;
  hrv: number | null;
  stepCount: number | null;
  activeEnergy: number | null;
  restingHeartRate: number | null;
  respiratoryRate: number | null;
  sleepTotal: number | null;
  sleepAsleep: number | null;
  sleepCore: number | null;
  sleepDeep: number | null;
  sleepREM: number | null;
  sleepAwake: number | null;
  bloodOxygen: number | null;
  walkingDistance: number | null;
  swimmingDistance: number | null;
  swimmingStrokeCount: number | null;
}

export interface DayData {
  date: string; // YYYY-MM-DD
  records: HealthRecord[];
  baselineHR: number | null;
}

export type ActivityType = 'sauna' | 'walk' | 'workout' | 'swim' | 'cold_plunge' | 'other';

export interface DetectedEvent {
  id: string;
  startTime: Date;
  endTime: Date;
  peakHR: number;
  peakTime: Date;
  durationMinutes: number;
  recoveryMinutes: number | null;
  recoveryEndTime: Date | null;
  preHRV: number | null;
  postHRV: number | null;
  elevationAboveBaseline: number | null;
  activeEnergyKJ: number;
  totalSteps: number;
  hrvChangePercent: number | null;
  avgStepsPerMinute: number;
  totalSwimmingDistance: number;
  label: ActivityType | null;
  confirmed: boolean;
  dismissed: boolean;
  suggestedLabel: ActivityType | null;
}

/** @deprecated Use DetectedEvent instead */
export type SaunaSession = DetectedEvent;

export interface ChartDataPoint {
  time: number; // minutes since midnight (0-1439)
  timeLabel: string; // "HH:MM"
  heartRate: number | null;
  hrv: number | null;
}

export interface DayNotes {
  date: string;
  pain: number | null;
  stress: number | null;
  notes: string;
}

export interface ConfirmedEventSummary {
  label: ActivityType;
  startTime: string;
  peakHR: number;
  durationMinutes: number;
  recoveryMinutes: number | null;
  preHRV: number | null;
  postHRV: number | null;
  hrvChangePercent: number | null;
  morningHRV: number | null;
  nextMorningHRV: number | null;
  elevationAboveBaseline: number | null;
  totalSteps: number;
  walkingDistance: number | null;
}

export interface DaySummary {
  date: string;
  baselineHR: number | null;
  avgHRV: number | null;
  minHRV: number | null;
  maxHRV: number | null;
  totalSteps: number;
  totalActiveEnergyKJ: number;
  totalDistance: number | null;
  sleepTotal: number | null;
  sleepDeep: number | null;
  sleepREM: number | null;
  events: ConfirmedEventSummary[];
  notes: DayNotes | null;
}

export interface Insight {
  id: string;
  type: 'positive' | 'warning' | 'neutral';
  title: string;
  description: string;
  metric?: string;
}
