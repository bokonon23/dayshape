import { useState } from 'react';
import type { DaySummary } from '../lib/types';

interface SessionHistoryTableProps {
  summaries: DaySummary[];
  onNavigateToDay?: (date: string) => void;
}

const LABEL_NAMES: Record<string, string> = {
  sauna: 'Sauna',
  walk: 'Walk',
  workout: 'Workout',
  swim: 'Swim',
  cold_plunge: 'Cold Plunge',
  other: 'Other',
};

const LABEL_COLORS: Record<string, string> = {
  sauna: 'text-orange-400',
  walk: 'text-green-400',
  workout: 'text-blue-400',
  swim: 'text-sky-400',
  cold_plunge: 'text-cyan-400',
  other: 'text-gray-400',
};

type SortKey = 'date' | 'label' | 'peakHR' | 'elevation' | 'duration' | 'recovery' | 'morningHRV' | 'postHRV' | 'nextMorningHRV';

export default function SessionHistoryTable({
  summaries,
  onNavigateToDay,
}: SessionHistoryTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const rows = summaries.flatMap((s) =>
    s.events.map((e) => ({
      date: s.date,
      label: e.label,
      peakHR: e.peakHR,
      elevation: e.elevationAboveBaseline,
      duration: e.durationMinutes,
      recovery: e.recoveryMinutes,
      morningHRV: e.morningHRV,
      postHRV: e.postHRV,
      nextMorningHRV: e.nextMorningHRV,
      startTime: e.startTime,
    }))
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
          Session History
        </h2>
        <div className="py-8 text-center text-gray-600">No confirmed sessions yet</div>
      </div>
    );
  }

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'date':
        cmp = a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
        break;
      case 'label':
        cmp = a.label.localeCompare(b.label);
        break;
      case 'peakHR':
        cmp = a.peakHR - b.peakHR;
        break;
      case 'elevation':
        cmp = (a.elevation ?? 0) - (b.elevation ?? 0);
        break;
      case 'duration':
        cmp = a.duration - b.duration;
        break;
      case 'recovery':
        cmp = (a.recovery ?? 999) - (b.recovery ?? 999);
        break;
      case 'morningHRV':
        cmp = (a.morningHRV ?? 0) - (b.morningHRV ?? 0);
        break;
      case 'postHRV':
        cmp = (a.postHRV ?? 0) - (b.postHRV ?? 0);
        break;
      case 'nextMorningHRV':
        cmp = (a.nextMorningHRV ?? 0) - (b.nextMorningHRV ?? 0);
        break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th
      className="cursor-pointer px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-300 whitespace-nowrap"
      onClick={() => handleSort(k)}
    >
      {children}
      {sortKey === k && (
        <span className="ml-1">{sortAsc ? '\u2191' : '\u2193'}</span>
      )}
    </th>
  );

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
        Session History
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <SortHeader k="date">Date</SortHeader>
              <SortHeader k="label">Activity</SortHeader>
              <SortHeader k="peakHR">Peak HR</SortHeader>
              <SortHeader k="elevation">HR Elev.</SortHeader>
              <SortHeader k="recovery">Recovery</SortHeader>
              <SortHeader k="morningHRV">Morning HRV</SortHeader>
              <SortHeader k="postHRV">Post HRV</SortHeader>
              <SortHeader k="nextMorningHRV">Next-day HRV</SortHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {sorted.map((row, i) => (
              <tr
                key={`${row.date}-${row.startTime}-${i}`}
                className="cursor-pointer hover:bg-gray-800/50"
                onClick={() => onNavigateToDay?.(row.date)}
              >
                <td className="px-3 py-2 text-gray-300">{row.date}</td>
                <td className={`px-3 py-2 font-medium ${LABEL_COLORS[row.label] ?? 'text-gray-400'}`}>
                  {LABEL_NAMES[row.label] ?? row.label}
                </td>
                <td className="px-3 py-2 text-gray-300">{Math.round(row.peakHR)} bpm</td>
                <td className="px-3 py-2 text-gray-300">
                  {row.elevation !== null ? `+${Math.round(row.elevation)}` : '\u2014'}
                </td>
                <td className="px-3 py-2 text-gray-300">
                  {row.recovery !== null ? `${row.recovery} min` : '\u2014'}
                </td>
                <td className="px-3 py-2 text-gray-300">
                  {row.morningHRV !== null ? `${Math.round(row.morningHRV)} ms` : '\u2014'}
                </td>
                <td className={`px-3 py-2 font-medium ${
                  row.morningHRV !== null && row.postHRV !== null
                    ? row.postHRV < row.morningHRV
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                    : 'text-gray-600'
                }`}>
                  {row.postHRV !== null ? `${Math.round(row.postHRV)} ms` : '\u2014'}
                </td>
                <td className={`px-3 py-2 font-medium ${
                  row.morningHRV !== null && row.nextMorningHRV !== null
                    ? row.nextMorningHRV > row.morningHRV
                      ? 'text-emerald-400'
                      : 'text-yellow-400'
                    : 'text-gray-600'
                }`}>
                  {row.nextMorningHRV !== null ? `${Math.round(row.nextMorningHRV)} ms` : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
