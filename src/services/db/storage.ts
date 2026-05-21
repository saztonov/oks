import { DbSnapshotSchema, type DbSnapshot } from '@/shared/schemas';
import seedJson from '@/shared/mock/seed.json';

const STORAGE_KEY = 'oks:db:v2';

let cache: DbSnapshot | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function readFromStorage(): DbSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const json = JSON.parse(raw);
    const parsed = DbSnapshotSchema.safeParse(json);
    if (!parsed.success) {
      console.warn('Stored DB snapshot invalid, will reseed', parsed.error.issues.slice(0, 3));
      return null;
    }
    return parsed.data;
  } catch (e) {
    console.warn('Failed to read DB from localStorage', e);
    return null;
  }
}

function writeToStorage(snap: DbSnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch (e) {
    console.error('Failed to persist DB', e);
  }
}

export function loadDb(): DbSnapshot {
  if (cache) return cache;
  const fromStorage = readFromStorage();
  if (fromStorage) {
    cache = fromStorage;
    return cache;
  }
  const seedParsed = DbSnapshotSchema.parse(seedJson);
  cache = seedParsed;
  writeToStorage(cache);
  return cache;
}

export function saveDb(updater: (prev: DbSnapshot) => DbSnapshot): DbSnapshot {
  const prev = loadDb();
  const next = updater(prev);
  cache = next;
  writeToStorage(next);
  notify();
  return next;
}

export function resetDb(): DbSnapshot {
  const seedParsed = DbSnapshotSchema.parse(seedJson);
  cache = seedParsed;
  writeToStorage(cache);
  notify();
  return cache;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
