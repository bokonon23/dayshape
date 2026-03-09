import type { DetectedEvent } from '../lib/types';

const LABEL_NAMES: Record<string, string> = {
  sauna: 'Sauna',
  walk: 'Walk',
  workout: 'Workout',
  swim: 'Swim',
  cold_plunge: 'Cold Plunge',
  other: 'Activity',
};

interface SessionCardProps {
  event: DetectedEvent;
  baselineHR: number;
  morningHRV?: { value: number; time: Date } | null;
  nextMorningHRV?: { value: number; time: Date } | null;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDelta(before: number, after: number): { text: string; isNegative: boolean } {
  const diff = after - before;
  const pct = before > 0 ? Math.round(((after - before) / before) * 100) : null;
  const arrow = diff > 0 ? '\u2191' : diff < 0 ? '\u2193' : '\u2192';
  const sign = diff > 0 ? '+' : '';
  const pctStr = pct !== null ? ` (${sign}${pct}%)` : '';
  return {
    text: `${sign}${Math.round(diff)} ms ${arrow}${pctStr}`,
    isNegative: diff < 0,
  };
}

export default function SessionCard({
  event,
  baselineHR,
  morningHRV,
  nextMorningHRV,
}: SessionCardProps) {
  const elevPct =
    baselineHR > 0
      ? Math.round((event.elevationAboveBaseline! / baselineHR) * 100)
      : null;

  const activeEnergyKcal = Math.round(event.activeEnergyKJ / 4.184);
  const labelName = LABEL_NAMES[event.label ?? 'other'] ?? 'Activity';
  const postLabel = labelName.toLowerCase();

  // Compute HRV suppression (morning → post-session)
  const hrvSuppression =
    morningHRV && event.postHRV !== null
      ? formatDelta(morningHRV.value, event.postHRV)
      : null;

  // Compute HRV rebound (morning today → morning tomorrow)
  const hrvRebound =
    morningHRV && nextMorningHRV
      ? formatDelta(morningHRV.value, nextMorningHRV.value)
      : null;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
        {labelName} Summary
      </h2>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-800/50">
          <Row
            label="Resting HR (baseline)"
            value={`${baselineHR} bpm`}
          />
          <Row
            label="Peak HR (session)"
            value={`${Math.round(event.peakHR)} bpm`}
            highlight
          />
          <Row
            label="HR elevation above rest"
            value={`+${Math.round(event.elevationAboveBaseline!)} bpm${elevPct !== null ? `  (+${elevPct}%)` : ''}`}
          />
          <Row
            label={`Recovery to ${baselineHR + 10} bpm`}
            value={
              event.recoveryMinutes !== null
                ? `${event.recoveryMinutes} minutes`
                : 'Not recovered in data'
            }
          />

          {/* HRV section header */}
          <SectionHeader label="HRV Analysis" />

          {/* Morning HRV (first reading of the day) */}
          {morningHRV && (
            <Row
              label={`Morning HRV (${formatTime(morningHRV.time)})`}
              value={`${Math.round(morningHRV.value)} ms`}
            />
          )}

          {/* Pre-session HRV (nearest reading before event) */}
          {event.preHRV !== null && (
            <Row
              label="HRV before session"
              value={`${Math.round(event.preHRV)} ms`}
            />
          )}

          {/* Post-session HRV (nearest reading after recovery) */}
          {event.postHRV !== null && (
            <Row
              label={`HRV after ${postLabel}`}
              value={`${Math.round(event.postHRV)} ms`}
            />
          )}

          {/* HRV suppression: morning vs post-session delta */}
          {hrvSuppression && (
            <Row
              label="HRV suppression"
              sublabel="morning → post-session"
              value={hrvSuppression.text}
              warn={hrvSuppression.isNegative}
            />
          )}

          {/* Next morning HRV rebound */}
          {nextMorningHRV && (
            <Row
              label={`Next morning HRV`}
              value={`${Math.round(nextMorningHRV.value)} ms`}
            />
          )}
          {hrvRebound && (
            <Row
              label="HRV rebound"
              sublabel="this morning → next morning"
              value={hrvRebound.text}
              positive={!hrvRebound.isNegative}
              warn={hrvRebound.isNegative}
            />
          )}

          {/* Activity stats */}
          <SectionHeader label="Activity" />
          <Row
            label="Active energy (session)"
            value={`${activeEnergyKcal} kcal`}
          />
          <Row
            label="Steps (session window)"
            value={`${event.totalSteps.toLocaleString()}`}
          />
          <Row
            label="Session window"
            value={`${formatTime(event.startTime)} – ${formatTime(event.endTime)}`}
          />
          <Row
            label="Peak time"
            value={formatTime(event.peakTime)}
          />
        </tbody>
      </table>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr>
      <td
        colSpan={2}
        className="pt-4 pb-1 text-xs font-medium tracking-wider text-gray-500 uppercase"
      >
        {label}
      </td>
    </tr>
  );
}

function Row({
  label,
  sublabel,
  value,
  highlight,
  warn,
  positive,
}: {
  label: string;
  sublabel?: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
  positive?: boolean;
}) {
  return (
    <tr>
      <td className="py-2 pr-4 text-gray-500">
        {label}
        {sublabel && (
          <span className="block text-xs text-gray-600">{sublabel}</span>
        )}
      </td>
      <td
        className={`py-2 text-right font-semibold ${
          highlight
            ? 'text-orange-400'
            : positive
              ? 'text-emerald-400'
              : warn
                ? 'text-yellow-400'
                : 'text-gray-200'
        }`}
      >
        {value}
      </td>
    </tr>
  );
}
