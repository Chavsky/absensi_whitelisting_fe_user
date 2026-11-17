import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '../services/api';

export type OfficeConnectivityStatus = 'checking' | 'connected' | 'disconnected';

/**
 * Deteksi koneksi KANTOR: keputusan diambil dari hasil ping nyata ke
 * endpoint `/api/health` backend, bukan dari `navigator.onLine` — perangkat
 * bisa saja "online" di Wi-Fi lain tanpa bisa menjangkau backend kantor.
 * Event `online`/`offline`/`visibilitychange` hanya dipakai untuk memicu
 * pemeriksaan segera.
 *
 * Anti-beban backend:
 * - Satu ping in-flight maksimal (request tidak pernah menumpuk).
 * - Interval adaptif: 30 dtk saat terhubung, 10 dtk saat terputus.
 * - Timeout 5 dtk per percobaan, sehingga tidak ada request menggantung.
 */

const HEALTH_TIMEOUT_MS = 5000;
const RECHECK_CONNECTED_MS = 30000;
const RECHECK_DISCONNECTED_MS = 10000;

async function pingBackend(): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

export function useOfficeConnectivity(): OfficeConnectivityStatus {
  const [status, setStatus] = useState<OfficeConnectivityStatus>('checking');
  const inFlight = useRef(false);
  const lastReachable = useRef<boolean | null>(null);

  const check = useCallback(async (): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const reachable = await pingBackend();
      lastReachable.current = reachable;
      setStatus(reachable ? 'connected' : 'disconnected');
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const loop = async (): Promise<void> => {
      if (cancelled) return;
      await check();
      if (cancelled) return;
      const delay = lastReachable.current === false
        ? RECHECK_DISCONNECTED_MS
        : RECHECK_CONNECTED_MS;
      timer = window.setTimeout(() => { void loop(); }, delay);
    };

    const handleOnline = () => { void check(); };
    const handleOffline = () => { setStatus('disconnected'); };
    const handleVisible = () => {
      if (document.visibilityState === 'visible') { void check(); }
    };

    void loop();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [check]);

  return status;
}
