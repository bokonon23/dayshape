import type { DayNotes } from './types';

const STORAGE_KEY = 'dayshape_notes_v1';

function loadAll(): DayNotes[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DayNotes[];
  } catch {
    return [];
  }
}

export function loadNotes(date: string): DayNotes | null {
  return loadAll().find((n) => n.date === date) ?? null;
}

export function saveNotes(notes: DayNotes): void {
  const all = loadAll();
  const idx = all.findIndex((n) => n.date === notes.date);
  if (idx >= 0) {
    all[idx] = notes;
  } else {
    all.push(notes);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
