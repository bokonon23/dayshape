import type { DaySummary } from '../lib/types';

interface TrendSummaryCardsProps {
  summaries: DaySummary[];
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function StatCard({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: string;
  unit: string;
  delta: number | null;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-100">{value}</span>
        <span className="text-sm text-gray-500">{unit}</span>
      </div>
      {delta !== null && (
        <div
          className={`mt-1 text-xs font-medium ${
            delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-500'
          }`}
        >
          {delta > 0 ? '\u2191' : delta < 0 ? '\u2193' : '\u2192'}
          {Math.abs(delta).toFixed(1)}% vs prior 7d
        </div>
      )}
    </div>
  );
}

export default function TrendSummaryCards({ summaries }: TrendSummaryCardsProps) {
  const sorted = [...summaries].sort((a, b) => b.date.localeCompare(a.date));
  const recent7 = sorted.slice(0, 7);
  const prior7 = sorted.slice(7, 14);

  const recentBaselineHRs = recent7.map((s) => s.baselineHR).filter((v): v is number => v !== null);
  const priorBaselineHRs = prior7.map((s) => s.baselineHR).filter((v): v is number => v !== null);
  const avgBaselineRecent = avg(recentBaselineHRs);
  const avgBaselinePrior = avg(priorBaselineHRs);
  const baselineDelta =
    avgBaselineRecent !== null && avgBaselinePrior !== null && avgBaselinePrior > 0
      ? ((avgBaselineRecent - avgBaselinePrior) / avgBaselinePrior) * 100
      : null;

  const recentHRVs = recent7.map((s) => s.avgHRV).filter((v): v is number => v !== null);
  const priorHRVs = prior7.map((s) => s.avgHRV).filter((v): v is number => v !== null);
  const avgHRVRecent = avg(recentHRVs);
  const avgHRVPrior = avg(priorHRVs);
  const hrvDelta =
    avgHRVRecent !== null && avgHRVPrior !== null && avgHRVPrior > 0
      ? ((avgHRVRecent - avgHRVPrior) / avgHRVPrior) * 100
      : null;

  const recentSessions = recent7.reduce((sum, s) => sum + s.events.length, 0);
  const priorSessions = prior7.reduce((sum, s) => sum + s.events.length, 0);
  const sessionDelta =
    priorSessions > 0
      ? ((recentSessions - priorSessions) / priorSessions) * 100
      : null;

  const recentSleep = recent7.map((s) => s.sleepTotal).filter((v): v is number => v !== null);
  const priorSleep = prior7.map((s) => s.sleepTotal).filter((v): v is number => v !== null);
  const avgSleepRecent = avg(recentSleep);
  const avgSleepPrior = avg(priorSleep);
  const sleepDelta =
    avgSleepRecent !== null && avgSleepPrior !== null && avgSleepPrior > 0
      ? ((avgSleepRecent - avgSleepPrior) / avgSleepPrior) * 100
      : null;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Avg Resting HR"
        value={avgBaselineRecent !== null ? Math.round(avgBaselineRecent).toString() : '\u2014'}
        unit="bpm"
        delta={baselineDelta}
      />
      <StatCard
        label="Avg HRV"
        value={avgHRVRecent !== null ? Math.round(avgHRVRecent).toString() : '\u2014'}
        unit="ms"
        delta={hrvDelta}
      />
      <StatCard
        label="Sessions"
        value={recentSessions.toString()}
        unit="last 7d"
        delta={sessionDelta}
      />
      <StatCard
        label="Avg Sleep"
        value={avgSleepRecent !== null ? avgSleepRecent.toFixed(1) : '\u2014'}
        unit="hrs"
        delta={sleepDelta}
      />
    </div>
  );
}
