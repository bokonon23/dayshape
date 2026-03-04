import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import type { ChartDataPoint, SaunaSession } from '../lib/types';

interface DayTimelineProps {
  data: ChartDataPoint[];
  baselineHR: number | null;
  sessions: SaunaSession[];
}

function formatTick(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${String(h).padStart(2, '0')}:00`;
}

function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

interface TooltipPayloadEntry {
  dataKey: string;
  value: number | null;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const h = Math.floor((label ?? 0) / 60);
  const m = (label ?? 0) % 60;
  const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-gray-300">{time}</p>
      {payload.map((entry) => {
        if (entry.value === null) return null;
        const label =
          entry.dataKey === 'heartRate' ? 'HR' : 'HRV';
        const unit = entry.dataKey === 'heartRate' ? 'bpm' : 'ms';
        return (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {label}: {Math.round(entry.value)} {unit}
          </p>
        );
      })}
    </div>
  );
}

export default function DayTimeline({
  data,
  baselineHR,
  sessions,
}: DayTimelineProps) {
  const hrData = data.filter((d) => d.heartRate !== null);
  const hrvData = data.filter((d) => d.hrv !== null);

  // Merge for chart — Recharts needs a single data array for ComposedChart
  const mergedMap = new Map<number, ChartDataPoint>();
  for (const d of data) {
    mergedMap.set(d.time, d);
  }
  const merged = Array.from(mergedMap.values()).sort((a, b) => a.time - b.time);

  const ticks = Array.from({ length: 25 }, (_, i) => i * 60);

  return (
    <div className="w-full rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
        Heart Rate Timeline
      </h2>
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={merged} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            domain={[0, 1440]}
            ticks={ticks}
            tickFormatter={formatTick}
            stroke="#6b7280"
            fontSize={11}
            interval={2}
          />
          <YAxis
            yAxisId="hr"
            domain={[40, 180]}
            stroke="#6b7280"
            fontSize={11}
            label={{
              value: 'bpm',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#6b7280', fontSize: 11 },
            }}
          />
          <YAxis
            yAxisId="hrv"
            orientation="right"
            domain={[0, 100]}
            stroke="#6b7280"
            fontSize={11}
            label={{
              value: 'ms',
              angle: 90,
              position: 'insideRight',
              style: { fill: '#6b7280', fontSize: 11 },
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Sauna session highlight zones */}
          {sessions.map((s, i) => (
            <ReferenceArea
              key={i}
              yAxisId="hr"
              x1={minutesSinceMidnight(s.startTime)}
              x2={minutesSinceMidnight(s.endTime)}
              y1={40}
              y2={180}
              fill="#f97316"
              fillOpacity={0.08}
              stroke="#f97316"
              strokeOpacity={0.3}
              strokeDasharray="4 4"
            />
          ))}

          {/* Baseline HR line */}
          {baselineHR !== null && (
            <ReferenceLine
              yAxisId="hr"
              y={baselineHR}
              stroke="#6b7280"
              strokeDasharray="6 4"
              label={{
                value: `Baseline ${baselineHR}`,
                position: 'right',
                style: { fill: '#6b7280', fontSize: 10 },
              }}
            />
          )}

          {/* HR line */}
          <Line
            yAxisId="hr"
            type="monotone"
            dataKey="heartRate"
            stroke="#ef4444"
            strokeWidth={1.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />

          {/* HR data points */}
          {hrData.length > 0 && (
            <Scatter
              yAxisId="hr"
              dataKey="heartRate"
              data={hrData}
              fill="#ef4444"
              r={2}
              isAnimationActive={false}
            />
          )}

          {/* HRV scatter */}
          {hrvData.length > 0 && (
            <Scatter
              yAxisId="hrv"
              dataKey="hrv"
              data={hrvData}
              fill="#22d3ee"
              r={4}
              shape="diamond"
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
