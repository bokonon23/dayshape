import type { DaySummary, Insight } from './types';

export function computeInsights(summaries: DaySummary[]): Insight[] {
  const sorted = [...summaries].sort((a, b) => a.date.localeCompare(b.date));
  const insights: Insight[] = [];

  if (sorted.length < 2) {
    insights.push({
      id: 'need-data',
      type: 'neutral',
      title: 'Keep uploading',
      description:
        'Upload more days of data to unlock trend insights and correlations.',
    });
    return insights;
  }

  // 1. Consistency insight
  const totalEvents = sorted.reduce((sum, s) => sum + s.events.length, 0);
  if (totalEvents > 0) {
    const saunaSessions = sorted.reduce(
      (sum, s) => sum + s.events.filter((e) => e.label === 'sauna').length,
      0
    );
    if (saunaSessions > 0) {
      insights.push({
        id: 'consistency',
        type: 'neutral',
        title: 'Activity log',
        description: `${saunaSessions} sauna session${saunaSessions !== 1 ? 's' : ''} across ${sorted.length} days of data.`,
        metric: `${totalEvents} total events`,
      });
    }
  }

  // 2. Sauna → next-day HRV
  if (sorted.length >= 3) {
    const afterSaunaHRVs: number[] = [];
    const noSaunaHRVs: number[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const today = sorted[i];
      const tomorrow = sorted[i + 1];
      if (tomorrow.avgHRV === null) continue;

      // Check if dates are consecutive
      const d1 = new Date(today.date);
      const d2 = new Date(tomorrow.date);
      const diffDays = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays !== 1) continue;

      const hadSauna = today.events.some((e) => e.label === 'sauna');
      if (hadSauna) {
        afterSaunaHRVs.push(tomorrow.avgHRV);
      } else {
        noSaunaHRVs.push(tomorrow.avgHRV);
      }
    }

    if (afterSaunaHRVs.length >= 2 && noSaunaHRVs.length >= 2) {
      const avgAfter =
        afterSaunaHRVs.reduce((a, b) => a + b, 0) / afterSaunaHRVs.length;
      const avgWithout =
        noSaunaHRVs.reduce((a, b) => a + b, 0) / noSaunaHRVs.length;
      const pctDiff = ((avgAfter - avgWithout) / avgWithout) * 100;

      if (Math.abs(pctDiff) >= 3) {
        insights.push({
          id: 'sauna-hrv',
          type: pctDiff > 0 ? 'positive' : 'warning',
          title: 'Sauna & HRV',
          description:
            pctDiff > 0
              ? `Your HRV tends to be ${Math.round(pctDiff)}% higher the day after a sauna session.`
              : `Your HRV tends to be ${Math.round(Math.abs(pctDiff))}% lower the day after a sauna session.`,
          metric: `${Math.round(avgAfter)} vs ${Math.round(avgWithout)} ms`,
        });
      }
    }
  }

  // 3. Deep sleep → next-day HRV
  if (sorted.length >= 5) {
    const sleepHRVPairs: { deep: number; nextHRV: number }[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const today = sorted[i];
      const tomorrow = sorted[i + 1];
      if (today.sleepDeep === null || tomorrow.avgHRV === null) continue;
      const d1 = new Date(today.date);
      const d2 = new Date(tomorrow.date);
      if ((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24) !== 1) continue;
      sleepHRVPairs.push({ deep: today.sleepDeep, nextHRV: tomorrow.avgHRV });
    }

    if (sleepHRVPairs.length >= 4) {
      const medianDeep = [...sleepHRVPairs]
        .sort((a, b) => a.deep - b.deep)
        [Math.floor(sleepHRVPairs.length / 2)].deep;

      const highDeepHRV = sleepHRVPairs
        .filter((p) => p.deep >= medianDeep)
        .map((p) => p.nextHRV);
      const lowDeepHRV = sleepHRVPairs
        .filter((p) => p.deep < medianDeep)
        .map((p) => p.nextHRV);

      if (highDeepHRV.length >= 2 && lowDeepHRV.length >= 2) {
        const avgHigh =
          highDeepHRV.reduce((a, b) => a + b, 0) / highDeepHRV.length;
        const avgLow =
          lowDeepHRV.reduce((a, b) => a + b, 0) / lowDeepHRV.length;
        const pctDiff = ((avgHigh - avgLow) / avgLow) * 100;

        if (pctDiff > 5) {
          insights.push({
            id: 'sleep-hrv',
            type: 'positive',
            title: 'Sleep & recovery',
            description: `Days with more deep sleep are followed by ${Math.round(pctDiff)}% higher HRV.`,
            metric: `${Math.round(avgHigh)} vs ${Math.round(avgLow)} ms`,
          });
        }
      }
    }
  }

  // 4. Recovery improvement over time
  const saunaEvents = sorted.flatMap((s) =>
    s.events
      .filter((e) => e.label === 'sauna' && e.recoveryMinutes !== null)
      .map((e) => ({ date: s.date, recovery: e.recoveryMinutes! }))
  );

  if (saunaEvents.length >= 3) {
    const firstHalf = saunaEvents.slice(0, Math.floor(saunaEvents.length / 2));
    const secondHalf = saunaEvents.slice(Math.floor(saunaEvents.length / 2));
    const avgFirst =
      firstHalf.reduce((a, b) => a + b.recovery, 0) / firstHalf.length;
    const avgSecond =
      secondHalf.reduce((a, b) => a + b.recovery, 0) / secondHalf.length;

    if (avgFirst > 0 && avgSecond < avgFirst * 0.85) {
      insights.push({
        id: 'recovery-improving',
        type: 'positive',
        title: 'Recovery improving',
        description: `Your sauna recovery time has improved from ${Math.round(avgFirst)} to ${Math.round(avgSecond)} minutes.`,
        metric: `${Math.round(((avgFirst - avgSecond) / avgFirst) * 100)}% faster`,
      });
    }
  }

  // 5. Stress → HRV correlation
  const stressHRVPairs = sorted
    .filter((s) => s.notes?.stress !== null && s.notes?.stress !== undefined && s.avgHRV !== null)
    .map((s) => ({ stress: s.notes!.stress!, hrv: s.avgHRV! }));

  if (stressHRVPairs.length >= 5) {
    const medianStress = [...stressHRVPairs]
      .sort((a, b) => a.stress - b.stress)
      [Math.floor(stressHRVPairs.length / 2)].stress;

    const highStressHRV = stressHRVPairs
      .filter((p) => p.stress > medianStress)
      .map((p) => p.hrv);
    const lowStressHRV = stressHRVPairs
      .filter((p) => p.stress <= medianStress)
      .map((p) => p.hrv);

    if (highStressHRV.length >= 2 && lowStressHRV.length >= 2) {
      const avgHigh =
        highStressHRV.reduce((a, b) => a + b, 0) / highStressHRV.length;
      const avgLow =
        lowStressHRV.reduce((a, b) => a + b, 0) / lowStressHRV.length;
      const pctDiff = ((avgLow - avgHigh) / avgHigh) * 100;

      if (pctDiff > 5) {
        insights.push({
          id: 'stress-hrv',
          type: 'warning',
          title: 'Stress impact',
          description: `On lower-stress days, your HRV is ${Math.round(pctDiff)}% higher than on high-stress days.`,
          metric: `${Math.round(avgLow)} vs ${Math.round(avgHigh)} ms`,
        });
      }
    }
  }

  return insights;
}
