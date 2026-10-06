import type { Entry, ObservationDraft } from '../types';

export const browserStorageEnabled = import.meta.env.VITE_STORAGE_MODE === 'browser';
// Pages projects share an origin; keep each project's observations in its own namespace.
export const observationStorageKey = `deep-sky-observations-v1:${location.pathname.replace(/index\.html$/, '')}`;

export class BrowserStorageError extends Error {}

function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    ['id', 'object', 'date', 'location', 'equipment', 'sky', 'text'].every(
      (key) => typeof entry[key] === 'string',
    ) &&
    ['nebula', 'galaxy', 'cluster', 'other'].includes(String(entry.kind)) &&
    ['telescope', 'camera', 'createdAt'].every(
      (key) => entry[key] == null || typeof entry[key] === 'string',
    ) &&
    ['latitude', 'longitude', 'seeing', 'cloudCover', 'humidity'].every(
      (key) =>
        entry[key] == null || (typeof entry[key] === 'number' && Number.isFinite(entry[key])),
    )
  );
}

function read(): Entry[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(observationStorageKey);
  } catch {
    throw new BrowserStorageError('无法读取此浏览器的记录。请允许本站使用浏览器存储后重试。');
  }
  if (raw === null) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data) || !data.every(isEntry)) throw new Error('Invalid records');
    return data;
  } catch {
    // Do not overwrite unreadable data with an empty diary.
    throw new BrowserStorageError('浏览器中的记录无法读取，原有数据未被修改。请检查备份后重试。');
  }
}

function write(entries: Entry[]) {
  try {
    localStorage.setItem(observationStorageKey, JSON.stringify(entries));
  } catch {
    throw new BrowserStorageError('无法更新记录：浏览器存储不可用或空间不足。请导出备份后重试。');
  }
}

/** The Pages build never sends personal observations to a server. */
export async function browserRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (path === '/observations' && method === 'GET') return read() as T;
  if (path === '/observations' && method === 'POST') {
    const draft = JSON.parse(String(init.body)) as ObservationDraft;
    const entry: Entry = { ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    const entries = read();
    write([entry, ...entries]);
    return entry as T;
  }
  if (path.startsWith('/observations/') && method === 'DELETE') {
    const id = decodeURIComponent(path.slice('/observations/'.length));
    write(read().filter((entry) => entry.id !== id));
    return undefined as T;
  }
  throw new BrowserStorageError('此操作在浏览器手记中不可用。');
}
