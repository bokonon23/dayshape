import { loadNotes } from '../lib/notesStore';

interface DaySelectorProps {
  dates: string[]; // YYYY-MM-DD format
  selected: string;
  onSelect: (date: string) => void;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function hasNotes(date: string): boolean {
  const notes = loadNotes(date);
  if (!notes) return false;
  return notes.pain !== null || notes.stress !== null || notes.notes.trim().length > 0;
}

export default function DaySelector({
  dates,
  selected,
  onSelect,
}: DaySelectorProps) {
  if (dates.length <= 1) return null;

  return (
    <div className="flex gap-2">
      {dates.map((date) => {
        const noted = hasNotes(date);
        return (
          <button
            key={date}
            onClick={() => onSelect(date)}
            className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              date === selected
                ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
            }`}
          >
            {formatDateLabel(date)}
            {noted && (
              <span
                className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-violet-400"
                title="Has notes"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
