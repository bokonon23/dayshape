import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from 'recharts';
import type { HealthRecord, SaunaSession } from '../lib/types';

interface HrvChartProps {
  records: HealthRecord[];
  session: SaunaSession | null;
}

interface HrvDataPoint {
  time: string;
  timeMinutes: number;
  hrv: number;
  isPostSauna: boolean;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface TooltipPayloadEntry {
  payload: HrvDataPoint;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-gray-300">{d.time}</p>
      <p className="text-violet-400">HRV: {Math.round(d.hrv)} ms</p>
      {d.isPostSauna && (
        <p className="text-xs text-yellow-400">Post-sauna reading</p>
      )}
    </div>
  );
}

export default function HrvChart({ records, session }: HrvChartProps) {
  const sessionEndMinute = session
    ? session.endTime.getHours() * 60 + session.endTime.getMinutes()
    : null;
  const sessionStartMinute = session
    ? session.startTime.getHours() * 60 + session.startTime.getMinutes()
    : null;

  const hrvReadings: HrvDataPoint[] = records
    .filter((r) => r.hrv !== null)
    .map((r) => {
      const timeMin = r.timestamp.getHours() * 60 + r.timestamp.getMinutes();
      // Post-sauna = first HRV reading after session end
      const isPostSauna =
        session !== null &&
        sessionEndMinute !== null &&
        sessionStartMinute !== null &&
        timeMin > sessionStartMinute &&
        timeMin <= sessionEndMinute + 120;
      return {
        time: formatTime(r.timestamp),
        timeMinutes: timeMin,
        hrv: r.hrv!,
        isPostSauna,
      };
    });

  if (hrvReadings.length === 0) return null;

  const maxHrv = Math.max(...hrvReadings.map((d) => d.hrv));
  const yMax = Math.ceil((maxHrv + 10) / 10) * 10;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
        HRV Readings (ms)
      </h2>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={hrvReadings} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#4b5563"
            fontSize={10}
          />
          <YAxis
            domain={[0, yMax]}
            stroke="#4b5563"
            fontSize={11}
            label={{
              value: 'ms',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#6b7280', fontSize: 10 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Mark post-sauna region */}
          {session && hrvReadings.some((d) => d.isPostSauna) && (
            <ReferenceLine
              x={hrvReadings.find((d) => d.isPostSauna)?.time}
              stroke="#eab308"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            >
              <Label
                value="Post-sauna"
                position="top"
                style={{ fill: '#eab308', fontSize: 10 }}
              />
            </ReferenceLine>
          )}

          <Bar dataKey="hrv" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {hrvReadings.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.isPostSauna ? '#eab308' : '#8b5cf6'}
                fillOpacity={entry.isPostSauna ? 0.8 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
