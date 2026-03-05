import type { DetectedEvent, ActivityType } from '../lib/types';

interface EventConfirmationProps {
  event: DetectedEvent;
  onConfirm: (id: string, label: ActivityType) => void;
  onDismiss: (id: string) => void;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const ACTIVITY_OPTIONS: { label: string; value: ActivityType; color: string }[] = [
  { label: 'Sauna', value: 'sauna', color: 'bg-orange-600 hover:bg-orange-500' },
  { label: 'Walk', value: 'walk', color: 'bg-green-600 hover:bg-green-500' },
  { label: 'Workout', value: 'workout', color: 'bg-blue-600 hover:bg-blue-500' },
  { label: 'Cold Plunge', value: 'cold_plunge', color: 'bg-cyan-600 hover:bg-cyan-500' },
  { label: 'Other', value: 'other', color: 'bg-gray-600 hover:bg-gray-500' },
];

export default function EventConfirmation({
  event,
  onConfirm,
  onDismiss,
}: EventConfirmationProps) {
  const suggested = ACTIVITY_OPTIONS.find((o) => o.value === event.suggestedLabel);

  return (
    <div className="rounded-xl border border-orange-500/30 bg-gray-900 p-5">
      <div className="mb-4">
        <p className="text-gray-300">
          Looks like something happened at{' '}
          <span className="font-semibold text-orange-400">
            {formatTime(event.startTime)}
          </span>{' '}
          — elevated HR for{' '}
          <span className="font-semibold text-gray-100">
            {event.durationMinutes} mins
          </span>
          , peak{' '}
          <span className="font-semibold text-gray-100">
            {Math.round(event.peakHR)} bpm
          </span>
          {event.avgStepsPerMinute > 0 && (
            <>
              , ~{event.avgStepsPerMinute} steps/min
            </>
          )}
          .{' '}
          <span className="text-gray-400">What was this?</span>
        </p>
        {suggested && (
          <p className="mt-1 text-xs text-gray-500">
            Best guess: {suggested.label}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {ACTIVITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onConfirm(event.id, option.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${option.color} ${
              option.value === event.suggestedLabel
                ? 'ring-2 ring-white/20'
                : ''
            }`}
          >
            {option.label}
          </button>
        ))}
        <button
          onClick={() => onDismiss(event.id)}
          className="rounded-lg border border-gray-700 bg-transparent px-4 py-2 text-sm text-gray-500 transition-colors hover:border-gray-600 hover:text-gray-400"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
