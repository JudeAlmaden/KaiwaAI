import { useState, useEffect } from 'react';
import { AppBlocker } from '@/plugins/app-blocker';

export interface NetworkStatus {
  isOnline: boolean;
  isNativeChecked?: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also verify via Capacitor plugin if available
    AppBlocker.isNetworkAvailable()
      .then((res) => {
        setIsOnline(res.connected);
      })
      .catch(() => {
        // Plugin check fallback to navigator.onLine
      });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}
