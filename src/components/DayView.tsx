import { useMemo } from 'react';
import DayTimeline from './DayTimeline';
import SessionDetail from './SessionDetail';
import HrvChart from './HrvChart';
import DaySelector from './DaySelector';
import SessionCard from './SessionCard';
import EventConfirmation from './EventConfirmation';
import DayNotes from './DayNotes';
import SleepSummary from './SleepSummary';
import { toChartData } from '../lib/hrAnalysis';
import { findMorningHRV, findMorningHRVForDate, getNextDay } from '../lib/sleepAnalysis';
import type { DayData, DetectedEvent, ActivityType, DayNotes as DayNotesType } from '../lib/types';

interface DayViewProps {
  days: DayData[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  events: DetectedEvent[];
  onConfirm: (id: string, label: ActivityType) => void;
  onDismiss: (id: string) => void;
  onNotesChange: (notes: DayNotesType) => void;
}

export default function DayView({
  days,
  selectedDate,
  onSelectDate,
  events,
  onConfirm,
  onDismiss,
  onNotesChange,
}: DayViewProps) {
  const dates = useMemo(() => days.map((d) => d.date), [days]);

  const currentDay = useMemo(
    () => days.find((d) => d.date === selectedDate) ?? null,
    [days, selectedDate]
  );

  const chartData = useMemo(
    () => (currentDay ? toChartData(currentDay.records) : []),
    [currentDay]
  );

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

  // HRV context for session cards
  const morningHRV = useMemo(
    () => (currentDay ? findMorningHRV(currentDay.records) : null),
    [currentDay]
  );
  const nextMorningHRV = useMemo(
    () => findMorningHRVForDate(days, getNextDay(selectedDate)),
    [days, selectedDate]
  );

  return (
    <div className="space-y-6">
      {/* Day selector + summary */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <DaySelector
          dates={dates}
          selected={selectedDate}
          onSelect={onSelectDate}
        />
        {currentDay && (
          <div className="flex gap-6 text-sm text-gray-500">
            <span>
              Baseline HR:{' '}
              <span className="font-medium text-gray-300">
                {currentDay.baselineHR ?? '\u2014'} bpm
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
        records={currentDay?.records}
      />

      {/* Sleep summary — always shown if data exists */}
      {currentDay && (
        <SleepSummary records={currentDay.records} />
      )}

      {/* Day notes */}
      {currentDay && (
        <DayNotes date={selectedDate} onNotesChange={onNotesChange} />
      )}

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
              onConfirm={onConfirm}
              onDismiss={onDismiss}
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
                morningHRV={morningHRV}
                nextMorningHRV={nextMorningHRV}
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
  );
}
