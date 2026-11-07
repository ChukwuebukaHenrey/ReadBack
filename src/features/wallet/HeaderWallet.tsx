import { useEffect, useState } from 'react';
import { loadWallet, onWalletChange } from './service';

/** Public address only. Shows the short form; Copy copies the full address. */
export function HeaderWallet({ announce }: { announce: (text: string) => void }) {
  const [address, setAddress] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const refresh = () => { loadWallet().then(w => { if (alive) setAddress(w?.address ?? null); }).catch(() => { if (alive) setAddress(null); }); };
    refresh();
    const stop = onWalletChange(refresh);
    return () => { alive = false; stop(); };
  }, []);
  if (!address) return null;
  async function copy() {
    try { await navigator.clipboard.writeText(address!); announce('Public wallet address copied.'); }
    catch { announce('Copy unavailable. Open Your Devnet wallet to select the full address.'); }
  }
  return <div className="header-wallet">
    <span><span className="sr-only">Wallet address ending </span><span aria-hidden="true">{address.slice(0, 4)}…</span>{address.slice(-4)}</span>
    <button type="button" onClick={() => void copy()}>Copy address</button>
  </div>;
}
