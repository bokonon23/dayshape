import { useState, useMemo, useCallback, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import DayView from './components/DayView';
import TrendsView from './components/TrendsView';
import ViewToggle from './components/ViewToggle';
import { parseCSV } from './lib/csvParser';
import { enrichDayData } from './lib/hrAnalysis';
import { detectEvents } from './lib/eventDetector';
import { saveEvent, mergeWithStored } from './lib/eventStore';
import { computeDaySummary } from './lib/summaryComputer';
import { saveSummaries, loadAllSummaries } from './lib/summaryStore';
import { loadNotes } from './lib/notesStore';
import type { DayData, DetectedEvent, ActivityType, DaySummary, DayNotes } from './lib/types';

export default function App() {
  const [days, setDays] = useState<DayData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [events, setEvents] = useState<DetectedEvent[]>([]);
  const [view, setView] = useState<'day' | 'trends'>('day');
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Load stored summaries on mount
  useEffect(() => {
    setSummaries(loadAllSummaries());
  }, []);

  const handleFileLoaded = useCallback((csvText: string, name: string) => {
    setLoading(true);
    setFileName(name);

    // Defer heavy work so the loading spinner renders first
    setTimeout(() => {
      try {
        const parsed = parseCSV(csvText);
        const enriched = parsed.map(enrichDayData);
        setDays(enriched);
        if (enriched.length > 0) {
          setSelectedDate(enriched[0].date);
        }

        // Compute and persist summaries for all days in the upload
        const newSummaries = enriched.map((day) => {
          const detected = detectEvents(day.records, day.baselineHR);
          const merged = mergeWithStored(detected, day.date);
          const notes = loadNotes(day.date);
          return computeDaySummary(day, merged, notes, enriched);
        });
        saveSummaries(newSummaries);
        setSummaries(loadAllSummaries());
      } finally {
        setLoading(false);
      }
    }, 50);
  }, []);

  const currentDay = useMemo(
    () => days.find((d) => d.date === selectedDate) ?? null,
    [days, selectedDate]
  );

  // Detect events and merge with stored labels whenever the selected day changes
  useMemo(() => {
    if (!currentDay) {
      setEvents([]);
      return;
    }
    const detected = detectEvents(currentDay.records, currentDay.baselineHR);
    const merged = mergeWithStored(detected, currentDay.date);
    setEvents(merged);
  }, [currentDay]);

  const handleConfirm = useCallback((id: string, label: ActivityType) => {
    setEvents((prev) => {
      const updated = prev.map((e) =>
        e.id === id ? { ...e, label, confirmed: true, dismissed: false } : e
      );
      // Persist event label
      const event = updated.find((e) => e.id === id);
      if (event) saveEvent(event);
      // Update summary for this day
      if (currentDay) {
        const notes = loadNotes(currentDay.date);
        const summary = computeDaySummary(currentDay, updated, notes, days);
        saveSummaries([summary]);
        setSummaries(loadAllSummaries());
      }
      return updated;
    });
  }, [currentDay, days]);

  const handleDismiss = useCallback((id: string) => {
    setEvents((prev) => {
      const updated = prev.map((e) =>
        e.id === id ? { ...e, dismissed: true } : e
      );
      const event = updated.find((e) => e.id === id);
      if (event) saveEvent(event);
      return updated;
    });
  }, []);

  const handleNotesChange = useCallback(
    (notes: DayNotes) => {
      // Re-compute summary for the day with updated notes
      if (currentDay) {
        const summary = computeDaySummary(currentDay, events, notes, days);
        saveSummaries([summary]);
        setSummaries(loadAllSummaries());
      }
    },
    [currentDay, events]
  );

  const handleNavigateToDay = useCallback(
    (date: string) => {
      // If the day is loaded, switch to it
      const dayExists = days.find((d) => d.date === date);
      if (dayExists) {
        setSelectedDate(date);
        setView('day');
      }
    },
    [days]
  );

  const handleReset = useCallback(() => {
    setDays([]);
    setSelectedDate('');
    setFileName('');
    setEvents([]);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">
              Day<span className="text-orange-400">Shape</span>
            </h1>
            {days.length > 0 && (
              <ViewToggle view={view} onViewChange={setView} />
            )}
          </div>
          {days.length > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{fileName}</span>
              <button
                onClick={handleReset}
                className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 hover:text-gray-300"
              >
                Load new file
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-6 py-6">
        {loading ? (
          <div className="mt-32 flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-orange-400" />
            <p className="text-sm text-gray-400">Processing {fileName}...</p>
          </div>
        ) : days.length === 0 ? (
          <FileUpload onFileLoaded={handleFileLoaded} />
        ) : view === 'day' ? (
          <DayView
            days={days}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            events={events}
            onConfirm={handleConfirm}
            onDismiss={handleDismiss}
            onNotesChange={handleNotesChange}
          />
        ) : (
          <TrendsView
            summaries={summaries}
            onNavigateToDay={handleNavigateToDay}
          />
        )}
      </main>
    </div>
  );
}
