import { useEffect, useState } from 'react';
import { api } from '../services/api';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export type ApiAvailability = 'checking' | 'available' | 'unavailable';

export function useApiAvailability() {
  const [status, setStatus] = useState<ApiAvailability>('checking');

  useEffect(() => {
    let active = true;
    let checking = false;
    const check = async () => {
      if (!navigator.onLine) {
        setStatus('unavailable');
        return;
      }
      if (checking) return;
      checking = true;
      try {
        await api.checkAvailability();
        if (active) setStatus('available');
      } catch {
        if (active) setStatus('unavailable');
      } finally { checking = false; }
    };
    const onOnline = () => { void check(); };
    const onOffline = () => setStatus('unavailable');
    void check();
    const timer = window.setInterval(() => { void check(); }, 30000);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return status;
}
