import { useCallback, useEffect, useRef, useState } from 'react';
import type { Entry, ObservationDraft } from '../types';
import { browserStorageEnabled, observationStorageKey } from '../lib/browserStorage';
import { ApiError, errorMessage, request } from '../lib/api';

/** Mounted once per account. Abort reads and ignore late writes after logout/account changes. */
export function useEntries(onError: (message: string) => void, onExpired: () => void) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reload, setReload] = useState(0);
  const alive = useRef(true);
  const callbacks = useRef({ onError, onExpired });
  callbacks.current = { onError, onExpired };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const handleError = useCallback((error: unknown) => {
    if (!alive.current) return;
    if (error instanceof ApiError && error.status === 401) callbacks.current.onExpired();
    else callbacks.current.onError(errorMessage(error));
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    request<Entry[]>('/observations', { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setEntries(data);
          setStatus('ready');
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setStatus('error');
          handleError(error);
        }
      });
    return () => controller.abort();
  }, [reload, handleError]);

  useEffect(() => {
    if (!browserStorageEnabled) return;
    const changed = (event: StorageEvent) => {
      if (
        event.storageArea === localStorage &&
        (event.key === observationStorageKey || event.key === null)
      )
        setReload((value) => value + 1);
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);

  async function create(draft: ObservationDraft): Promise<boolean> {
    try {
      const entry = await request<Entry>('/observations', {
        method: 'POST',
        body: JSON.stringify(draft),
      });
      if (!alive.current) return false;
      setEntries((current) => [entry, ...current]);
      return true;
    } catch (error) {
      handleError(error);
      return false;
    }
  }
  async function remove(id: string): Promise<boolean> {
    try {
      await request<void>(`/observations/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!alive.current) return false;
      setEntries((current) => current.filter((entry) => entry.id !== id));
      return true;
    } catch (error) {
      handleError(error);
      return false;
    }
  }
  return { entries, status, create, remove, retry: () => setReload((value) => value + 1) };
}
