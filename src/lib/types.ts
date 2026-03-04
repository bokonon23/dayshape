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
}

export interface DayData {
  date: string; // YYYY-MM-DD
  records: HealthRecord[];
  baselineHR: number | null;
}

export interface SaunaSession {
  startTime: Date;
  endTime: Date;
  peakHR: number;
  peakTime: Date;
  recoveryMinutes: number | null;
  recoveryEndTime: Date | null;
  preHRV: number | null;
  postHRV: number | null;
  elevationAboveBaseline: number | null;
}

export interface ChartDataPoint {
  time: number; // minutes since midnight (0-1439)
  timeLabel: string; // "HH:MM"
  heartRate: number | null;
  hrv: number | null;
}
