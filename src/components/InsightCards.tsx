import type { Insight } from '../lib/types';

interface InsightCardsProps {
  insights: Insight[];
}

const TYPE_STYLES: Record<string, { border: string; bg: string; icon: string }> = {
  positive: { border: 'border-green-800', bg: 'bg-green-950/50', icon: '\u2191' },
  warning: { border: 'border-yellow-800', bg: 'bg-yellow-950/50', icon: '\u26a0' },
  neutral: { border: 'border-gray-700', bg: 'bg-gray-900', icon: '\u2139' },
};

export default function InsightCards({ insights }: InsightCardsProps) {
  if (insights.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {insights.map((insight) => {
        const style = TYPE_STYLES[insight.type] ?? TYPE_STYLES.neutral;
        return (
          <div
            key={insight.id}
            className={`rounded-xl border ${style.border} ${style.bg} p-4`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">{style.icon}</span>
              <div>
                <h3 className="text-sm font-medium text-gray-200">
                  {insight.title}
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  {insight.description}
                </p>
                {insight.metric && (
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    {insight.metric}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
