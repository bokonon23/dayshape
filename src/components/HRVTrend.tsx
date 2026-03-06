import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
} from 'recharts';
import type { DaySummary } from '../lib/types';

interface HRVTrendProps {
  summaries: DaySummary[];
}

export default function HRVTrend({ summaries }: HRVTrendProps) {
  const sorted = [...summaries]
    .filter((s) => s.avgHRV !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
          HRV Trend
        </h2>
        <div className="py-8 text-center text-gray-600">No HRV data yet</div>
      </div>
    );
  }

  const data = sorted.map((s) => ({
    date: s.date,
    label: s.date.slice(5),
    avgHRV: s.avgHRV,
    minHRV: s.minHRV,
    maxHRV: s.maxHRV,
    hasEvent: s.events.length > 0,
  }));

  const allMin = data.map((d) => d.minHRV ?? d.avgHRV!);
  const allMax = data.map((d) => d.maxHRV ?? d.avgHRV!);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
        HRV Trend
      </h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="hrvBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#374151' }}
          />
          <YAxis
            domain={[
              Math.floor(Math.min(...allMin) - 10),
              Math.ceil(Math.max(...allMax) + 10),
            ]}
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
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                avgHRV: 'Avg HRV',
                minHRV: 'Min HRV',
                maxHRV: 'Max HRV',
              };
              return [`${Math.round(Number(value))} ms`, labels[String(name)] ?? name];
            }}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="maxHRV"
            stroke="none"
            fill="url(#hrvBand)"
          />
          <Area
            type="monotone"
            dataKey="minHRV"
            stroke="none"
            fill="#111827"
          />
          <Line
            type="monotone"
            dataKey="avgHRV"
            stroke="#22d3ee"
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
                  fill={payload.hasEvent ? '#f97316' : '#22d3ee'}
                  stroke="none"
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" /> Avg HRV
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-orange-500" /> Event day
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1 w-4 bg-cyan-400/20" /> Min-max range
        </span>
      </div>
    </div>
  );
}
