import { useEffect, useState } from 'react';
import { readLedger, type LedgerEntry } from '../transfers/ledger';
import { refreshPaymentStatuses, resendSamePayment } from '../transfers/service';
import { loadWallet } from '../wallet/service';
import { formatSol } from '../wallet/amount';
import { explainEntry } from './explain';

export function ActivityPanel({ announce, compact = false, useAI = false }: { announce: (text: string) => void; compact?: boolean; useAI?: boolean }) {
  const [explanation, setExplanation] = useState<{ id: string; text: string } | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    Promise.all([readLedger(), loadWallet()]).then(([records, wallet]) => { if (alive) { setEntries(records.filter(e => e.sender === wallet?.address).sort((a, b) => b.createdAt.localeCompare(a.createdAt))); setLoaded(true); } }).catch(() => { if (alive) setError('Payment history could not be loaded. Existing records have not been changed.'); });
    return () => { alive = false; };
  }, []);
  async function refresh(id?: string) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (id) await resendSamePayment(id);
      const [records, wallet] = await Promise.all([refreshPaymentStatuses(), loadWallet()]);
      setEntries(records.filter(e => e.sender === wallet?.address).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      announce('Payment status checked against Solana Devnet.');
    } catch (error) { setError(error instanceof Error ? error.message : 'The network could not be reached. Do not repeat a payment whose outcome is unknown.'); }
    finally { setBusy(false); }
  }
  async function explain(entry: LedgerEntry) {
    if (busy) return;
    setBusy(true); setError('');
    try { const text = await explainEntry(entry, useAI, AbortSignal.timeout(15000)); setExplanation({ id: entry.id, text }); announce(text); }
    catch { setError('This payment could not be explained right now. Its details above are unchanged.'); }
    finally { setBusy(false); }
  }
  const visible = compact ? entries.slice(0, 3) : entries;
  return <section className="rb-card rb-activity" aria-label="Payment activity">
    {compact && <h2>Recent activity</h2>}
    {!loaded && !error && <p>Loading payment records…</p>}
    {loaded && !entries.length && <p className="rb-empty">No payments yet.</p>}
    {!compact && <button disabled={busy} onClick={() => void refresh()}>{busy ? 'Checking…' : 'Refresh payment status'}</button>}
    <ul className="activity-list">{visible.map(entry => <li key={entry.id}>
      <h3>{entry.status === 'confirmed' ? 'Confirmed' : entry.status === 'failed' ? 'Failed' : 'Outcome unresolved'} — {formatSol(BigInt(entry.amount))} SOL to {entry.name}</h3>
      <p><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time> · Solana Devnet</p>
      {entry.signature && <><p className="wallet-address">{entry.signature}</p><a href={`https://explorer.solana.com/tx/${entry.signature}?cluster=devnet`} target="_blank" rel="noreferrer">View payment to {entry.name} on Solana Explorer (new tab)</a></>}
      {!['confirmed', 'failed'].includes(entry.status) && <p>Do not send a replacement while the outcome is unresolved.</p>}
      {!compact && entry.signature && ['submitted', 'submission_unknown'].includes(entry.status) && <button disabled={busy} onClick={() => void refresh(entry.id)}>Retry the same signed payment</button>}
      {!compact && <button disabled={busy} onClick={() => void explain(entry)}>Explain payment to {entry.name}</button>}
      {explanation?.id === entry.id && <p className="readback-text">{explanation.text}</p>}
    </li>)}</ul>
    {error && <p role="alert" className="error-message">{error}</p>}
  </section>;
}
