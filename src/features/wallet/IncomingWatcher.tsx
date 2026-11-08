import { useEffect, useState } from 'react';
import { loadWallet, onWalletChange } from './service';
import { watchIncoming } from './incoming';
import { isDemo } from '../demo/demo';

/** Live incoming-payment announcements. Silent if WebSockets are unavailable. */
export function useIncomingPayments(announce: (text: string) => void) {
  const [latest, setLatest] = useState('');
  useEffect(() => {
    let controller = new AbortController();
    const start = () => {
      controller.abort(); controller = new AbortController();
      const { signal } = controller;
      loadWallet().then(wallet => {
        if (!wallet || signal.aborted || isDemo()) return;
        return watchIncoming(wallet.address, text => { if (!signal.aborted) { setLatest(text); announce(text); } }, signal);
      }).catch(() => { /* Live announcements are optional; balance refresh still works. */ });
    };
    start();
    const stop = onWalletChange(start);
    return () => { stop(); controller.abort(); };
  }, [announce]);
  return latest;
}
