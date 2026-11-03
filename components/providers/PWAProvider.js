"use client";
import { useEffect } from 'react';

/**
 * Registers the public service worker used for the installable PWA shell
 * (offline fallback + cached branding assets). Authenticated pages always
 * stay online-first, see public/sw.js.
 */
export default function PWAProvider() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

    let registration = null;
    let disposed = false;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registered) => {
        if (disposed) return;
        registration = registered;
        // iOS keeps home-screen apps alive for days, so refresh the worker
        // whenever the app becomes visible again.
        if (registered.waiting) registered.waiting.postMessage({ type: 'SKIP_WAITING' });
      })
      .catch(() => {
        // Online functionality remains available if the device disallows workers.
      });

    function handleVisibility() {
      if (document.visibilityState === 'visible') registration?.update?.().catch(() => {});
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return null;
}
