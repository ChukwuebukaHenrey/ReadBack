import { useEffect, useSyncExternalStore } from 'react';
import { App } from './App';
import { Landing } from './Landing';

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}
export function Router() {
  const inApp = useSyncExternalStore(subscribe, () => window.location.hash === '#app', () => false);
  useEffect(() => {
    if (!inApp) document.title = 'Readback · Every step, understood';
    if (inApp || !window.location.hash) window.scrollTo(0, 0);
  }, [inApp]);
  return inApp ? <App /> : <Landing />;
}
