import { useState, useEffect, useRef, useCallback } from 'react';
import type { DayNotes as DayNotesType } from '../lib/types';
import { loadNotes, saveNotes } from '../lib/notesStore';

interface DayNotesProps {
  date: string;
  onNotesChange?: (notes: DayNotesType) => void;
}

export default function DayNotes({ date, onNotesChange }: DayNotesProps) {
  const [pain, setPain] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notes when date changes
  useEffect(() => {
    const stored = loadNotes(date);
    if (stored) {
      setPain(stored.pain);
      setStress(stored.stress);
      setNotes(stored.notes);
    } else {
      setPain(null);
      setStress(null);
      setNotes('');
    }
  }, [date]);

  const persist = useCallback(
    (p: number | null, s: number | null, n: string) => {
      const data: DayNotesType = { date, pain: p, stress: s, notes: n };
      saveNotes(data);
      onNotesChange?.(data);
    },
    [date, onNotesChange]
  );

  const handlePain = (val: number) => {
    const next = pain === val ? null : val;
    setPain(next);
    persist(next, stress, notes);
  };

  const handleStress = (val: number) => {
    const next = stress === val ? null : val;
    setStress(next);
    persist(pain, next, notes);
  };

  const handleNotes = (val: string) => {
    setNotes(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist(pain, stress, val), 500);
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
        Day Notes
      </h2>
      <div className="space-y-4">
        {/* Pain scale */}
        <div>
          <label className="mb-2 block text-sm text-gray-500">
            Pain level {pain !== null && <span className="text-gray-300">({pain}/10)</span>}
          </label>
          <div className="flex gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
              <button
                key={val}
                onClick={() => handlePain(val)}
                className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
                  pain !== null && val <= pain
                    ? val <= 3
                      ? 'bg-green-600 text-white'
                      : val <= 6
                        ? 'bg-yellow-600 text-white'
                        : 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Stress scale */}
        <div>
          <label className="mb-2 block text-sm text-gray-500">
            Stress level {stress !== null && <span className="text-gray-300">({stress}/10)</span>}
          </label>
          <div className="flex gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
              <button
                key={val}
                onClick={() => handleStress(val)}
                className={`h-8 w-8 rounded text-xs font-medium transition-colors ${
                  stress !== null && val <= stress
                    ? val <= 3
                      ? 'bg-blue-600 text-white'
                      : val <= 6
                        ? 'bg-purple-600 text-white'
                        : 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Free-text notes */}
        <div>
          <label className="mb-2 block text-sm text-gray-500">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => handleNotes(e.target.value)}
            placeholder="How did you feel today? Any context for the data..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-orange-500 focus:outline-none"
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
