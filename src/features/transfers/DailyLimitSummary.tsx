import { useEffect, useState } from 'react';
import { loadWallet } from '../wallet/service';
import { formatSol } from '../wallet/amount';
import { readLedger, spentToday } from './ledger';
import { DAILY_LIMIT } from './policy';
export function DailyLimitSummary() {
  const [remaining, setRemaining] = useState<bigint | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([loadWallet(), readLedger()]).then(([wallet, records]) => {
      if (active && wallet) { const used = spentToday(records, wallet.address); setRemaining(used >= DAILY_LIMIT ? 0n : DAILY_LIMIT - used); }
    }).catch(() => { /* Never invent a remaining allowance when storage is unavailable. */ });
    return () => { active = false; };
  }, []);
  return <p className="wallet-warning">Limits: 0.5 SOL per payment, 2 SOL per UTC day.{remaining !== null ? ` Remaining allowance: ${formatSol(remaining)} SOL, including reservations for unresolved payments.` : ' Your remaining allowance is checked when you prepare a payment.'} Limits apply in this browser; they are not enforced on-chain.</p>;
}
