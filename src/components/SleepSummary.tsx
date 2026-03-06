import type { HealthRecord } from '../lib/types';
import { extractSleepData, formatHours, sleepQualityLabel } from '../lib/sleepAnalysis';

interface SleepSummaryProps {
  records: HealthRecord[];
}

export default function SleepSummary({ records }: SleepSummaryProps) {
  const sleep = extractSleepData(records);

  if (sleep.total === null) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
          Sleep
        </h2>
        <p className="text-sm text-gray-500">No sleep data recorded for this day.</p>
      </div>
    );
  }

  const quality = sleepQualityLabel(sleep.deep, sleep.total);

  // Calculate percentages for the stacked bar
  const total = sleep.total || 1;
  const deepPct = ((sleep.deep ?? 0) / total) * 100;
  const remPct = ((sleep.rem ?? 0) / total) * 100;
  const corePct = ((sleep.core ?? 0) / total) * 100;
  const awakePct = ((sleep.awake ?? 0) / total) * 100;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
        Sleep
      </h2>

      {/* Total sleep + quality */}
      <div className="mb-4 flex items-baseline gap-3">
        <span className="text-2xl font-bold text-gray-100">
          {formatHours(sleep.total)}
        </span>
        <span className={`text-sm font-medium ${quality.color}`}>
          {quality.label}
        </span>
      </div>

      {/* Stacked bar */}
      <div className="mb-4 flex h-6 w-full overflow-hidden rounded-full bg-gray-800">
        {sleep.deep !== null && sleep.deep > 0 && (
          <div
            className="bg-indigo-500 transition-all"
            style={{ width: `${deepPct}%` }}
            title={`Deep: ${formatHours(sleep.deep)}`}
          />
        )}
        {sleep.core !== null && sleep.core > 0 && (
          <div
            className="bg-blue-500/60 transition-all"
            style={{ width: `${corePct}%` }}
            title={`Core: ${formatHours(sleep.core)}`}
          />
        )}
        {sleep.rem !== null && sleep.rem > 0 && (
          <div
            className="bg-cyan-400/50 transition-all"
            style={{ width: `${remPct}%` }}
            title={`REM: ${formatHours(sleep.rem)}`}
          />
        )}
        {sleep.awake !== null && sleep.awake > 0 && (
          <div
            className="bg-gray-600/50 transition-all"
            style={{ width: `${awakePct}%` }}
            title={`Awake: ${formatHours(sleep.awake)}`}
          />
        )}
      </div>

      {/* Legend + values */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
        <SleepRow color="bg-indigo-500" label="Deep" value={sleep.deep} />
        <SleepRow color="bg-blue-500/60" label="Core" value={sleep.core} />
        <SleepRow color="bg-cyan-400/50" label="REM" value={sleep.rem} />
        <SleepRow color="bg-gray-600/50" label="Awake" value={sleep.awake} />
      </div>
    </div>
  );
}

function SleepRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${color}`} />
      <span className="text-gray-500">{label}</span>
      <span className="ml-auto font-medium text-gray-300">
        {formatHours(value)}
      </span>
    </div>
  );
}
