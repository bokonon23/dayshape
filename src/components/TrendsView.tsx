import { useMemo } from 'react';
import TrendSummaryCards from './TrendSummaryCards';
import BaselineHRTrend from './BaselineHRTrend';
import HRVTrend from './HRVTrend';
import RecoveryTrend from './RecoveryTrend';
import SessionHistoryTable from './SessionHistoryTable';
import InsightCards from './InsightCards';
import { computeInsights } from '../lib/correlationEngine';
import type { DaySummary } from '../lib/types';

interface TrendsViewProps {
  summaries: DaySummary[];
  onNavigateToDay: (date: string) => void;
}

export default function TrendsView({ summaries, onNavigateToDay }: TrendsViewProps) {
  const insights = useMemo(() => computeInsights(summaries), [summaries]);

  if (summaries.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
        <p className="text-gray-400">No data yet.</p>
        <p className="mt-2 text-sm text-gray-600">
          Upload CSV files in Day view to start building trends.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Insights */}
      <InsightCards insights={insights} />

      {/* Summary cards */}
      <TrendSummaryCards summaries={summaries} />

      {/* Trend charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BaselineHRTrend summaries={summaries} />
        <HRVTrend summaries={summaries} />
      </div>

      {/* Recovery */}
      <RecoveryTrend summaries={summaries} />

      {/* Session history */}
      <SessionHistoryTable
        summaries={summaries}
        onNavigateToDay={onNavigateToDay}
      />
    </div>
  );
}
