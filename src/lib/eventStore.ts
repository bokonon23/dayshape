import type { ActivityType, DetectedEvent } from './types';

const STORAGE_KEY = 'dayshape_events_v1';

interface StoredEvent {
  id: string;
  date: string;
  label: ActivityType;
  startTimeMs: number;
  endTimeMs: number;
  dismissed: boolean;
}

interface StoredData {
  events: StoredEvent[];
}

function readStore(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { events: [] };
    return JSON.parse(raw) as StoredData;
  } catch {
    return { events: [] };
  }
}

function writeStore(data: StoredData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function dateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Save a confirmed or dismissed event to localStorage.
 */
export function saveEvent(event: DetectedEvent): void {
  const data = readStore();
  const existing = data.events.findIndex((e) => e.id === event.id);
  const entry: StoredEvent = {
    id: event.id,
    date: dateKey(event.startTime),
    label: event.label ?? 'other',
    startTimeMs: event.startTime.getTime(),
    endTimeMs: event.endTime.getTime(),
    dismissed: event.dismissed,
  };

  if (existing >= 0) {
    data.events[existing] = entry;
  } else {
    data.events.push(entry);
  }

  writeStore(data);
}

/**
 * Load stored events for a given date and merge with detected events.
 * Matches by id, or by startTime within 2 minutes if id doesn't match.
 */
export function mergeWithStored(detected: DetectedEvent[], date: string): DetectedEvent[] {
  const data = readStore();
  const stored = data.events.filter((e) => e.date === date);

  if (stored.length === 0) return detected;

  return detected.map((event) => {
    // Try exact id match first
    let match = stored.find((s) => s.id === event.id);

    // Fall back to time-based match (within 2 minutes)
    if (!match) {
      match = stored.find(
        (s) => Math.abs(s.startTimeMs - event.startTime.getTime()) < 2 * 60 * 1000
      );
    }

    if (match) {
      return {
        ...event,
        label: match.dismissed ? null : (match.label as ActivityType),
        confirmed: !match.dismissed,
        dismissed: match.dismissed,
      };
    }

    return event;
  });
}
