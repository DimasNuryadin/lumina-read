'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('LuminaRead PWA Service Worker registered:', reg.scope);
          })
          .catch((err) => {
            console.debug('Service Worker registration skipped or failed:', err);
          });
      });
    }
  }, []);

  return null;
}
