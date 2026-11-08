import { useCallback, useEffect, useState } from 'react';
import { loadWallet, onWalletChange, readBalance, type Balance, type PublicWallet } from '../wallet/service';
import { readLedger, spentToday, type LedgerEntry } from '../transfers/ledger';
import { listContacts, type Contact } from '../contacts/service';
import { DAILY_LIMIT } from '../transfers/policy';

export type WalletSummary = {
  loaded: boolean;
  wallet: PublicWallet | null;
  walletError: boolean;
  balance: Balance | null;
  balanceError: boolean;
  entries: LedgerEntry[];
  contacts: Contact[];
  remainingToday: bigint | null;
  refresh: () => void;
};

/** Everything the dashboard shows, from real local storage and Devnet. Nothing is invented. */
export function useWalletSummary(refreshKey: unknown = 0): WalletSummary {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<Omit<WalletSummary, 'refresh'>>({ loaded: false, wallet: null, walletError: false, balance: null, balanceError: false, entries: [], contacts: [], remainingToday: null });
  const refresh = useCallback(() => setTick(n => n + 1), []);
  useEffect(() => onWalletChange(refresh), [refresh]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      let wallet: PublicWallet | null = null; let walletError = false;
      try { wallet = await loadWallet(); } catch { walletError = true; }
      const [entries, contacts] = await Promise.all([
        readLedger().then(all => all.filter(e => e.sender === wallet?.address).sort((a, b) => b.createdAt.localeCompare(a.createdAt))).catch(() => [] as LedgerEntry[]),
        listContacts().catch(() => [] as Contact[]),
      ]);
      const used = wallet ? spentToday(entries, wallet.address) : 0n;
      const remainingToday = wallet ? (used >= DAILY_LIMIT ? 0n : DAILY_LIMIT - used) : null;
      if (controller.signal.aborted) return;
      setState(s => ({ ...s, loaded: true, wallet, walletError, entries, contacts, remainingToday, balanceError: false }));
      if (!wallet) return;
      try {
        const balance = await readBalance(wallet, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]));
        if (!controller.signal.aborted) setState(s => ({ ...s, balance, balanceError: false }));
      } catch { if (!controller.signal.aborted) setState(s => ({ ...s, balance: null, balanceError: true })); }
    })();
    return () => controller.abort();
  }, [tick, refreshKey]);

  return { ...state, refresh };
}
