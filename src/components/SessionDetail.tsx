import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Label,
} from 'recharts';
import type { ChartDataPoint, DetectedEvent } from '../lib/types';

const LABEL_NAMES: Record<string, string> = {
  sauna: 'Sauna',
  walk: 'Walk',
  workout: 'Workout',
  swim: 'Swim',
  cold_plunge: 'Cold Plunge',
  other: 'Activity',
};

interface SessionDetailProps {
  data: ChartDataPoint[];
  event: DetectedEvent;
  baselineHR: number;
}

function formatTick(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
  const time = formatTick(label ?? 0);
  const hrEntry = payload.find((e) => e.dataKey === 'heartRate');
  if (!hrEntry || hrEntry.value === null) return null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-gray-300">{time}</p>
      <p className="text-yellow-400">HR: {Math.round(hrEntry.value)} bpm</p>
    </div>
  );
}

export default function SessionDetail({
  data,
  event,
  baselineHR,
}: SessionDetailProps) {
  const recoveryTarget = baselineHR + 10;
  const peakMinute = minutesSinceMidnight(event.peakTime);
  const startMinute = minutesSinceMidnight(event.startTime);
  const endMinute = minutesSinceMidnight(event.endTime);
  const labelName = LABEL_NAMES[event.label ?? 'other'] ?? 'Activity';

  // Zoom window: 60 min before session start to 30 min after session end
  const zoomStart = Math.max(0, startMinute - 60);
  const zoomEnd = Math.min(1440, endMinute + 30);

  const zoomedData = data.filter(
    (d) => d.time >= zoomStart && d.time <= zoomEnd
  );

  const ticks: number[] = [];
  const firstTick = Math.ceil(zoomStart / 30) * 30;
  for (let t = firstTick; t <= zoomEnd; t += 30) {
    ticks.push(t);
  }

  const maxHR = Math.max(
    ...zoomedData.filter((d) => d.heartRate !== null).map((d) => d.heartRate!),
    event.peakHR
  );
  const yMax = Math.ceil((maxHR + 10) / 10) * 10;

  return (
    <div className="w-full rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase">
          {labelName} Detail — {formatTick(startMinute)} to {formatTick(endMinute)}
        </h2>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-orange-500" /> Peak ({Math.round(event.peakHR)} bpm @ {formatTick(peakMinute)})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-px w-4 border-t border-dotted border-gray-400" /> Recovery threshold ({recoveryTarget} bpm)
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={zoomedData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <defs>
            <linearGradient id="sessionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eab308" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#eab308" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            domain={[zoomStart, zoomEnd]}
            ticks={ticks}
            tickFormatter={formatTick}
            stroke="#4b5563"
            fontSize={11}
          />
          <YAxis
            domain={[0, yMax]}
            stroke="#4b5563"
            fontSize={11}
            label={{
              value: 'BPM',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#6b7280', fontSize: 10 },
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Sauna active zone (start to peak area) */}
          <ReferenceArea
            x1={startMinute}
            x2={endMinute}
            y1={0}
            y2={yMax}
            fill="#f97316"
            fillOpacity={0.06}
          />

          {/* Recovery threshold line */}
          <ReferenceLine
            y={recoveryTarget}
            stroke="#9ca3af"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />

          {/* Peak HR annotation line */}
          <ReferenceLine
            x={peakMinute}
            stroke="#f97316"
            strokeDasharray="3 3"
            strokeOpacity={0.6}
          >
            <Label
              value={`Peak: ${Math.round(event.peakHR)} bpm`}
              position="top"
              style={{ fill: '#f97316', fontSize: 11, fontWeight: 600 }}
            />
          </ReferenceLine>

          {/* Recovery point annotation */}
          {event.recoveryEndTime && (
            <ReferenceLine
              x={minutesSinceMidnight(event.recoveryEndTime)}
              stroke="#22c55e"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            >
              <Label
                value={`Back to ${recoveryTarget} bpm (${event.recoveryMinutes} min)`}
                position="insideTopRight"
                style={{ fill: '#22c55e', fontSize: 10 }}
              />
            </ReferenceLine>
          )}

          {/* HR area fill */}
          <Area
            type="monotone"
            dataKey="heartRate"
            stroke="none"
            fill="url(#sessionGradient)"
            connectNulls={false}
            isAnimationActive={false}
          />

          {/* HR line */}
          <Line
            type="monotone"
            dataKey="heartRate"
            stroke="#eab308"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
