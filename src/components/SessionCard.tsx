import type { SaunaSession } from '../lib/types';

interface SessionCardProps {
  session: SaunaSession;
  baselineHR: number;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function SessionCard({ session, baselineHR }: SessionCardProps) {
  const elevPct =
    baselineHR > 0
      ? Math.round((session.elevationAboveBaseline! / baselineHR) * 100)
      : null;

  const activeEnergyKcal = Math.round(session.activeEnergyKJ / 4.184);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
        Session Summary
      </h2>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-800/50">
          <Row
            label="Resting HR (baseline)"
            value={`${baselineHR} bpm`}
          />
          <Row
            label="Peak HR (session)"
            value={`${Math.round(session.peakHR)} bpm`}
            highlight
          />
          <Row
            label="HR elevation above rest"
            value={`+${Math.round(session.elevationAboveBaseline!)} bpm${elevPct !== null ? `  (+${elevPct}%)` : ''}`}
          />
          <Row
            label={`Recovery to ${baselineHR + 10} bpm`}
            value={
              session.recoveryMinutes !== null
                ? `${session.recoveryMinutes} minutes`
                : 'Not recovered in data'
            }
          />
          {session.preHRV !== null && (
            <Row
              label="HRV — pre-session"
              value={`${Math.round(session.preHRV)} ms`}
            />
          )}
          {session.postHRV !== null && (
            <Row
              label="HRV — post-sauna"
              value={`${Math.round(session.postHRV)} ms${session.hrvChangePercent !== null ? `  (${session.hrvChangePercent > 0 ? '\u2191' : '\u2193'}${Math.abs(session.hrvChangePercent)}%)` : ''}`}
              warn={session.hrvChangePercent !== null && session.hrvChangePercent < 0}
            />
          )}
          <Row
            label="Active energy (session)"
            value={`${activeEnergyKcal} kcal`}
          />
          <Row
            label="Steps (session window)"
            value={`${session.totalSteps.toLocaleString()}`}
          />
          <Row
            label="Session window"
            value={`${formatTime(session.startTime)} – ${formatTime(session.endTime)}`}
          />
          <Row
            label="Peak time"
            value={formatTime(session.peakTime)}
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
