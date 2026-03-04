import type { SaunaSession } from '../lib/types';

interface SessionCardProps {
  session: SaunaSession;
  index: number;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function SessionCard({ session, index }: SessionCardProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20 text-sm font-semibold text-orange-400">
          {index + 1}
        </span>
        <div>
          <h3 className="text-base font-semibold text-gray-100">
            Sauna Session
          </h3>
          <p className="text-sm text-gray-500">
            {formatTime(session.startTime)} – {formatTime(session.endTime)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          label="Peak HR"
          value={`${Math.round(session.peakHR)}`}
          unit="bpm"
          sublabel={`at ${formatTime(session.peakTime)}`}
        />
        <Stat
          label="Elevation"
          value={
            session.elevationAboveBaseline !== null
              ? `+${Math.round(session.elevationAboveBaseline)}`
              : '—'
          }
          unit="bpm"
          sublabel="above baseline"
        />
        <Stat
          label="Recovery"
          value={
            session.recoveryMinutes !== null
              ? `${session.recoveryMinutes}`
              : '—'
          }
          unit="min"
          sublabel={
            session.recoveryEndTime
              ? `until ${formatTime(session.recoveryEndTime)}`
              : 'not recovered in data'
          }
        />
        <Stat
          label="HRV"
          value={
            session.preHRV !== null && session.postHRV !== null
              ? `${Math.round(session.preHRV)} → ${Math.round(session.postHRV)}`
              : session.preHRV !== null
                ? `${Math.round(session.preHRV)}`
                : '—'
          }
          unit="ms"
          sublabel={
            session.preHRV !== null && session.postHRV !== null
              ? 'before → after'
              : 'limited data'
          }
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  sublabel,
}: {
  label: string;
  value: string;
  unit: string;
  sublabel: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-gray-100">
        {value}
        <span className="ml-1 text-sm font-normal text-gray-500">{unit}</span>
      </p>
      <p className="mt-0.5 text-xs text-gray-600">{sublabel}</p>
    </div>
  );
}
