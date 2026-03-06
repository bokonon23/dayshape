import {
  ComposedChart,
  Area,
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
import type { ChartDataPoint, DetectedEvent, HealthRecord } from '../lib/types';
import { extractSleepData, formatHours } from '../lib/sleepAnalysis';

interface DayTimelineProps {
  data: ChartDataPoint[];
  baselineHR: number | null;
  events: DetectedEvent[];
  records?: HealthRecord[];
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
        const entryLabel = entry.dataKey === 'heartRate' ? 'HR' : 'HRV';
        const unit = entry.dataKey === 'heartRate' ? 'bpm' : 'ms';
        return (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entryLabel}: {Math.round(entry.value)} {unit}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Estimate a sleep window from HR data.
 * Sleep typically shows as the longest period of low HR (near or below baseline).
 * We look for periods where HR is consistently low with very few steps.
 * Returns start/end as minutes since midnight, or null if no clear sleep detected.
 */
function estimateSleepWindow(
  records: HealthRecord[] | undefined,
  baselineHR: number | null
): { start: number; end: number } | null {
  if (!records || !baselineHR) return null;

  // Find the longest stretch of low HR readings with minimal steps (typically overnight)
  const threshold = baselineHR + 5;
  let bestStart = -1;
  let bestEnd = -1;
  let bestLen = 0;
  let runStart = -1;
  let runLen = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const hr = r.heartRateAvg;
    const mins = r.timestamp.getHours() * 60 + r.timestamp.getMinutes();

    // Consider a reading as "sleep-like" if: HR below threshold, or no HR (watch may be charging)
    // and no significant steps
    const isSleepLike =
      (hr === null || hr <= threshold) && (r.stepCount === null || r.stepCount < 5);

    if (isSleepLike) {
      if (runStart === -1) runStart = mins;
      runLen++;
    } else {
      if (runLen > bestLen) {
        bestStart = runStart;
        bestEnd = mins;
        bestLen = runLen;
      }
      runStart = -1;
      runLen = 0;
    }
  }

  // Check final run
  if (runLen > bestLen) {
    bestStart = runStart;
    const lastRec = records[records.length - 1];
    bestEnd = lastRec.timestamp.getHours() * 60 + lastRec.timestamp.getMinutes();
    bestLen = runLen;
  }

  // Only show if at least ~2 hours of sleep-like data
  if (bestLen < 30) return null;

  return { start: bestStart, end: bestEnd };
}

export default function DayTimeline({
  data,
  baselineHR,
  events,
  records,
}: DayTimelineProps) {
  const hrvData = data.filter((d) => d.hrv !== null);

  const mergedMap = new Map<number, ChartDataPoint>();
  for (const d of data) {
    mergedMap.set(d.time, d);
  }
  const merged = Array.from(mergedMap.values()).sort((a, b) => a.time - b.time);

  const ticks = Array.from({ length: 25 }, (_, i) => i * 60);

  // Sleep data
  const sleep = records ? extractSleepData(records) : null;
  const hasSleep = sleep && sleep.total !== null;
  const sleepWindow = estimateSleepWindow(records, baselineHR);

  return (
    <div className="w-full rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase">
          Heart Rate — Full Day
        </h2>
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-sm bg-red-500/40" /> HR
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rotate-45 bg-cyan-400" /> HRV
          </span>
          {baselineHR && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-px w-4 border-t border-dashed border-gray-500" /> Baseline
            </span>
          )}
          {events.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm bg-orange-500/30" /> Events
            </span>
          )}
          {hasSleep && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm bg-indigo-500/30" /> Sleep
            </span>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={merged} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <defs>
            <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            domain={[0, 1440]}
            ticks={ticks}
            tickFormatter={formatTick}
            stroke="#4b5563"
            fontSize={11}
            interval={2}
          />
          <YAxis
            yAxisId="hr"
            domain={[40, 180]}
            stroke="#4b5563"
            fontSize={11}
            label={{
              value: 'BPM',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#6b7280', fontSize: 10 },
            }}
          />
          <YAxis
            yAxisId="hrv"
            orientation="right"
            domain={[0, 100]}
            stroke="#4b5563"
            fontSize={11}
            label={{
              value: 'ms',
              angle: 90,
              position: 'insideRight',
              style: { fill: '#6b7280', fontSize: 10 },
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Sleep band — shown at bottom of chart as a coloured zone */}
          {hasSleep && sleepWindow && (
            <ReferenceArea
              yAxisId="hr"
              x1={sleepWindow.start}
              x2={sleepWindow.end}
              y1={40}
              y2={70}
              fill="#6366f1"
              fillOpacity={0.15}
              stroke="#6366f1"
              strokeOpacity={0.25}
              strokeDasharray="4 4"
              label={{
                value: `Sleep ${formatHours(sleep!.total)}`,
                position: 'insideLeft',
                style: { fill: '#818cf8', fontSize: 10, fontWeight: 500 },
              }}
            />
          )}

          {/* Event highlight zones */}
          {events.map((e) => (
            <ReferenceArea
              key={e.id}
              yAxisId="hr"
              x1={minutesSinceMidnight(e.startTime)}
              x2={minutesSinceMidnight(e.endTime)}
              y1={40}
              y2={180}
              fill={e.confirmed ? '#f97316' : '#6b7280'}
              fillOpacity={e.confirmed ? 0.1 : 0.08}
              stroke={e.confirmed ? '#f97316' : '#6b7280'}
              strokeOpacity={0.3}
              strokeDasharray="4 4"
            />
          ))}

          {/* Baseline HR line */}
          {baselineHR !== null && (
            <ReferenceLine
              yAxisId="hr"
              y={baselineHR}
              stroke="#06b6d4"
              strokeDasharray="6 4"
              strokeOpacity={0.5}
              label={{
                value: `Baseline ${baselineHR}`,
                position: 'right',
                style: { fill: '#06b6d4', fontSize: 10, opacity: 0.7 },
              }}
            />
          )}

          {/* HR area fill */}
          <Area
            yAxisId="hr"
            type="monotone"
            dataKey="heartRate"
            stroke="none"
            fill="url(#hrGradient)"
            connectNulls={false}
            isAnimationActive={false}
          />

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
