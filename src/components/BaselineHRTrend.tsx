import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { DaySummary } from '../lib/types';

interface BaselineHRTrendProps {
  summaries: DaySummary[];
}

export default function BaselineHRTrend({ summaries }: BaselineHRTrendProps) {
  const sorted = [...summaries]
    .filter((s) => s.baselineHR !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
          Resting HR Trend
        </h2>
        <div className="py-8 text-center text-gray-600">No baseline HR data yet</div>
      </div>
    );
  }

  const data = sorted.map((s) => ({
    date: s.date,
    label: s.date.slice(5), // MM-DD
    baselineHR: s.baselineHR,
    hasEvent: s.events.length > 0,
  }));

  const allHR = data.map((d) => d.baselineHR!);
  const meanHR = allHR.reduce((a, b) => a + b, 0) / allHR.length;
  const minHR = Math.min(...allHR);
  const maxHR = Math.max(...allHR);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
        Resting HR Trend
      </h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#374151' }}
          />
          <YAxis
            domain={[Math.floor(minHR - 5), Math.ceil(maxHR + 5)]}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#374151' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#e5e7eb',
            }}
            formatter={(value) => [`${Math.round(Number(value))} bpm`, 'Resting HR']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <ReferenceLine
            y={Math.round(meanHR)}
            stroke="#6b7280"
            strokeDasharray="3 3"
            label={{
              value: `Avg ${Math.round(meanHR)}`,
              fill: '#6b7280',
              fontSize: 11,
              position: 'right',
            }}
          />
          <Line
            type="monotone"
            dataKey="baselineHR"
            stroke="#f97316"
            strokeWidth={2}
            dot={(props: Record<string, unknown>) => {
              const { cx, cy, payload } = props as {
                cx: number;
                cy: number;
                payload: { hasEvent: boolean };
              };
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={payload.hasEvent ? 5 : 3}
                  fill={payload.hasEvent ? '#f97316' : '#9ca3af'}
                  stroke={payload.hasEvent ? '#f97316' : 'none'}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-orange-500" /> Event day
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-gray-400" /> Rest day
        </span>
      </div>
    </div>
  );
}
