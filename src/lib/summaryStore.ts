import type { DaySummary } from './types';

const STORAGE_KEY = 'dayshape_summaries_v1';

export function loadAllSummaries(): DaySummary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DaySummary[];
  } catch {
    return [];
  }
}

export function loadSummary(date: string): DaySummary | null {
  const all = loadAllSummaries();
  return all.find((s) => s.date === date) ?? null;
}

export function saveSummaries(summaries: DaySummary[]): void {
  const existing = loadAllSummaries();
  const byDate = new Map(existing.map((s) => [s.date, s]));

  for (const s of summaries) {
    byDate.set(s.date, s);
  }

  const merged = Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export function deleteSummary(date: string): void {
  const all = loadAllSummaries();
  const filtered = all.filter((s) => s.date !== date);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearAllSummaries(): void {
  localStorage.removeItem(STORAGE_KEY);
}
