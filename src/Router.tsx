import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react';
import { Landing } from './Landing';

// The workspace and auth screens carry the wallet and Solana code; the landing page doesn't need them.
const App = lazy(() => import('./App').then(m => ({ default: m.App })));
const Auth = lazy(() => import('./Auth').then(m => ({ default: m.Auth })));

type Route = 'app' | 'login' | 'signup' | 'landing';
const routeOf = (hash: string): Route => hash === '#app' ? 'app' : hash === '#login' ? 'login' : hash === '#signup' ? 'signup' : 'landing';
function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

export function Router() {
  const route = useSyncExternalStore(subscribe, () => routeOf(window.location.hash), () => 'landing' as Route);
  useEffect(() => {
    if (route === 'landing') document.title = 'Readback · Every step, understood';
    if (route !== 'landing' || !window.location.hash) window.scrollTo(0, 0);
  }, [route]);
  if (route === 'landing') return <Landing />;
  return <Suspense fallback={<p className="route-loading" role="status">Loading Readback…</p>}>
    {route === 'app' ? <App /> : <Auth mode={route} />}
  </Suspense>;
}
