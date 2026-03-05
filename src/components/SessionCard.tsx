import type { DetectedEvent } from '../lib/types';

const LABEL_NAMES: Record<string, string> = {
  sauna: 'Sauna',
  walk: 'Walk',
  workout: 'Workout',
  cold_plunge: 'Cold Plunge',
  other: 'Activity',
};

interface SessionCardProps {
  event: DetectedEvent;
  baselineHR: number;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function SessionCard({ event, baselineHR }: SessionCardProps) {
  const elevPct =
    baselineHR > 0
      ? Math.round((event.elevationAboveBaseline! / baselineHR) * 100)
      : null;

  const activeEnergyKcal = Math.round(event.activeEnergyKJ / 4.184);
  const labelName = LABEL_NAMES[event.label ?? 'other'] ?? 'Activity';
  const postLabel = labelName.toLowerCase();

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
          {event.preHRV !== null && (
            <Row
              label="HRV — pre-session"
              value={`${Math.round(event.preHRV)} ms`}
            />
          )}
          {event.postHRV !== null && (
            <Row
              label={`HRV — post-${postLabel}`}
              value={`${Math.round(event.postHRV)} ms${event.hrvChangePercent !== null ? `  (${event.hrvChangePercent > 0 ? '\u2191' : '\u2193'}${Math.abs(event.hrvChangePercent)}%)` : ''}`}
              warn={event.hrvChangePercent !== null && event.hrvChangePercent < 0}
            />
          )}
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

function Row({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <tr>
      <td className="py-2 pr-4 text-gray-500">{label}</td>
      <td
        className={`py-2 text-right font-semibold ${
          highlight
            ? 'text-orange-400'
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
