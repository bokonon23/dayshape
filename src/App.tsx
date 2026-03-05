import { useState, useMemo, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import DayTimeline from './components/DayTimeline';
import SessionDetail from './components/SessionDetail';
import HrvChart from './components/HrvChart';
import DaySelector from './components/DaySelector';
import SessionCard from './components/SessionCard';
import EventConfirmation from './components/EventConfirmation';
import { parseCSV } from './lib/csvParser';
import { enrichDayData, toChartData } from './lib/hrAnalysis';
import { detectEvents } from './lib/eventDetector';
import { saveEvent, mergeWithStored } from './lib/eventStore';
import type { DayData, DetectedEvent, ActivityType } from './lib/types';

export default function App() {
  const [days, setDays] = useState<DayData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [events, setEvents] = useState<DetectedEvent[]>([]);

  const handleFileLoaded = useCallback((csvText: string, name: string) => {
    const parsed = parseCSV(csvText);
    const enriched = parsed.map(enrichDayData);
    setDays(enriched);
    setFileName(name);
    if (enriched.length > 0) {
      setSelectedDate(enriched[0].date);
    }
  }, []);

  const currentDay = useMemo(
    () => days.find((d) => d.date === selectedDate) ?? null,
    [days, selectedDate]
  );

  const chartData = useMemo(
    () => (currentDay ? toChartData(currentDay.records) : []),
    [currentDay]
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

  const dates = useMemo(() => days.map((d) => d.date), [days]);

  const visibleEvents = useMemo(
    () => events.filter((e) => !e.dismissed),
    [events]
  );
  const unconfirmedEvents = useMemo(
    () => visibleEvents.filter((e) => !e.confirmed),
    [visibleEvents]
  );
  const confirmedEvents = useMemo(
    () => visibleEvents.filter((e) => e.confirmed),
    [visibleEvents]
  );

  const handleConfirm = useCallback((id: string, label: ActivityType) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, label, confirmed: true, dismissed: false } : e
      )
    );
    // Persist to localStorage
    const event = events.find((e) => e.id === id);
    if (event) {
      saveEvent({ ...event, label, confirmed: true, dismissed: false });
    }
  }, [events]);

  const handleDismiss = useCallback((id: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, dismissed: true } : e
      )
    );
    const event = events.find((e) => e.id === id);
    if (event) {
      saveEvent({ ...event, dismissed: true });
    }
  }, [events]);

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
          <h1 className="text-xl font-bold tracking-tight">
            Day<span className="text-orange-400">Shape</span>
          </h1>
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
        {days.length === 0 ? (
          <FileUpload onFileLoaded={handleFileLoaded} />
        ) : (
          <div className="space-y-6">
            {/* Day selector + summary */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <DaySelector
                dates={dates}
                selected={selectedDate}
                onSelect={setSelectedDate}
              />
              {currentDay && (
                <div className="flex gap-6 text-sm text-gray-500">
                  <span>
                    Baseline HR:{' '}
                    <span className="font-medium text-gray-300">
                      {currentDay.baselineHR ?? '—'} bpm
                    </span>
                  </span>
                  <span>
                    HR readings:{' '}
                    <span className="font-medium text-gray-300">
                      {currentDay.records.filter((r) => r.heartRateAvg !== null).length}
                    </span>
                  </span>
                  <span>
                    Events detected:{' '}
                    <span className="font-medium text-orange-400">
                      {visibleEvents.length}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Full day HR timeline */}
            <DayTimeline
              data={chartData}
              baselineHR={currentDay?.baselineHR ?? null}
              events={visibleEvents}
            />

            {/* Unconfirmed event prompts */}
            {unconfirmedEvents.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase">
                  Events to Review
                </h2>
                {unconfirmedEvents.map((event) => (
                  <EventConfirmation
                    key={event.id}
                    event={event}
                    onConfirm={handleConfirm}
                    onDismiss={handleDismiss}
                  />
                ))}
              </div>
            )}

            {/* Confirmed event detail views */}
            {confirmedEvents.map((event) => (
              <div key={event.id} className="space-y-6">
                {currentDay?.baselineHR != null && (
                  <SessionDetail
                    data={chartData}
                    event={event}
                    baselineHR={currentDay.baselineHR}
                  />
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                  {currentDay && (
                    <HrvChart
                      records={currentDay.records}
                      event={event}
                    />
                  )}
                  {currentDay?.baselineHR != null && (
                    <SessionCard
                      event={event}
                      baselineHR={currentDay.baselineHR}
                    />
                  )}
                </div>
              </div>
            ))}

            {visibleEvents.length === 0 && currentDay && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
                No elevated HR events detected for this day.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
