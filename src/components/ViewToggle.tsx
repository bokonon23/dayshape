interface ViewToggleProps {
  view: 'day' | 'trends';
  onViewChange: (view: 'day' | 'trends') => void;
}

export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg bg-gray-800 p-1">
      <button
        onClick={() => onViewChange('day')}
        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
          view === 'day'
            ? 'bg-gray-700 text-gray-100'
            : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        Day
      </button>
      <button
        onClick={() => onViewChange('trends')}
        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
          view === 'trends'
            ? 'bg-gray-700 text-gray-100'
            : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        Trends
      </button>
    </div>
  );
}
