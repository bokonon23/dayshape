import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { DaySummary } from '../lib/types';

interface RecoveryTrendProps {
  summaries: DaySummary[];
}

const LABEL_COLORS: Record<string, string> = {
  sauna: '#f97316',
  walk: '#22c55e',
  workout: '#3b82f6',
  cold_plunge: '#06b6d4',
  other: '#9ca3af',
};

const LABEL_NAMES: Record<string, string> = {
  sauna: 'Sauna',
  walk: 'Walk',
  workout: 'Workout',
  cold_plunge: 'Cold Plunge',
  other: 'Other',
};

export default function RecoveryTrend({ summaries }: RecoveryTrendProps) {
  const events = summaries
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((s) =>
      s.events
        .filter((e) => e.recoveryMinutes !== null)
        .map((e) => ({
          date: s.date,
          label: s.date.slice(5) + ' ' + LABEL_NAMES[e.label],
          recovery: e.recoveryMinutes!,
          activityLabel: e.label,
          color: LABEL_COLORS[e.label] ?? '#9ca3af',
        }))
    );

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
          Recovery Times
        </h2>
        <div className="py-8 text-center text-gray-600">No recovery data yet</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
        Recovery Times
      </h2>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={events} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={{ stroke: '#374151' }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#374151' }}
            label={{
              value: 'minutes',
              angle: -90,
              position: 'insideLeft',
              fill: '#6b7280',
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#e5e7eb',
            }}
            formatter={(value: number) => [`${value} min`, 'Recovery']}
          />
          <Bar dataKey="recovery" radius={[4, 4, 0, 0]}>
            {events.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        {Object.entries(LABEL_COLORS).map(([key, color]) => (
          <span key={key} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            {LABEL_NAMES[key]}
          </span>
        ))}
      </div>
    </div>
  );
}
