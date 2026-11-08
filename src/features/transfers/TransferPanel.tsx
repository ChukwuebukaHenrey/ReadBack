import { useEffect, useRef, useState } from 'react';
import { listContacts, type Contact } from '../contacts/service';
import { formatSol } from '../wallet/amount';
import { transfers, checkPayment } from './service';
import { spellAddress } from '../../lib/spell';
import type { Proposal, PaymentResult } from './coordinator';

export type TransferDraft = { contactId: string; amountText: string; requestId: number };
export function TransferPanel({ draft, announce }: { draft?: TransferDraft; announce: (text: string) => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [contactId, setContactId] = useState(draft?.contactId ?? '');
  const [amount, setAmount] = useState(draft?.amountText ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [dialogMessage, setDialogMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const inFlight = useRef(false);
  const alive = useRef(true);
  const currentProposal = useRef<string | null>(null);

  useEffect(() => {
    alive.current = true;
    listContacts().then(value => { if (alive.current) { setContacts(value); setLoaded(true); } }).catch(() => { if (alive.current) setError('Saved contacts could not be read. No payment can be prepared.'); });
    return () => { alive.current = false; if (currentProposal.current) transfers.cancel(currentProposal.current); };
  }, []);
  useEffect(() => {
    if (!proposal) return;
    const modal = dialog.current;
    modal?.showModal();
    heading.current?.focus();
    return () => modal?.close();
  }, [proposal]);
  useEffect(() => { if (result) heading.current?.focus(); }, [result]);

  async function review() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    announce('Preparing your Devnet test payment. Checking the network, fee and simulation.');
    try {
      const prepared = await transfers.prepare(contactId, amount);
      if (!alive.current) { transfers.cancel(prepared.id); return; }
      currentProposal.current = prepared.id; setResult(null); setDialogMessage(''); setProposal(prepared);
    } catch (error) { if (alive.current) setError(error instanceof Error ? error.message : 'Payment preparation failed. Nothing was sent.'); }
    finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }
  function close() {
    if (inFlight.current) return;
    if (proposal) transfers.cancel(proposal.id);
    currentProposal.current = null;
    dialog.current?.close(); setProposal(null); setResult(null); setDialogMessage(''); setError('');
    announce(result ? result.message : 'Review canceled. Nothing was sent.');
    opener.current?.focus();
  }
  async function confirm(event: React.MouseEvent<HTMLButtonElement>) {
    if (!event.isTrusted || inFlight.current || !proposal) return;
    inFlight.current = true; setBusy(true); setError(''); setDialogMessage('Sending. Checking the approved payment again, submitting it once, then waiting for Solana Devnet to confirm. Do not close this page.');
    try {
      const outcome = await transfers.confirm(proposal.id, event.nativeEvent);
      if (alive.current) { setDialogMessage(''); setResult(outcome); }
    } catch (error) {
      if (alive.current) { setError(error instanceof Error ? error.message : 'Payment checks failed. Check Activity before trying again.'); setDialogMessage('This approval is no longer usable. Close and review a new payment.'); requestAnimationFrame(() => heading.current?.focus()); }
    } finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }
  async function check() {
    if (!proposal || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try { setResult(await checkPayment(proposal.id)); }
    catch { setError('Could not reach the network. Keep the signature and check again; do not send a new payment.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <section aria-label="Prepare a payment">
    <p className="intro">Send test SOL to a contact you have independently verified. Limit: 0.5 SOL per payment and 2 SOL per UTC day.</p>
    <form className="panel transfer-form" onSubmit={e => { e.preventDefault(); void review(); }}>
      {draft && <p>The request filled these fields. Check or edit them, then review your payment.</p>}
      <label htmlFor="payment-contact">Saved contact</label>
      <select id="payment-contact" value={contactId} onChange={e => setContactId(e.target.value)} disabled={busy} required aria-describedby="contact-help">
        <option value="">Choose a verified contact</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <p id="contact-help" className="field-help">{loaded && !contacts.length ? 'Add and verify a contact in Saved contacts first.' : 'Recipients come only from your saved contacts.'}</p>
      <label htmlFor="payment-amount">Amount in SOL</label>
      <input id="payment-amount" inputMode="decimal" type="text" value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} required maxLength={30} aria-describedby="amount-help" />
      <p id="amount-help" className="field-help">Up to 0.5 SOL. Use an exact amount with at most nine decimal places.</p>
      <button type="submit" className="primary" disabled={!loaded || !contacts.length} aria-disabled={busy || undefined}>{busy && !proposal ? 'Preparing…' : 'Review payment'}</button>
      {!proposal && error && <p role="alert" className="error-message">{error}</p>}
    </form>
    <dialog ref={dialog} className="payment-dialog" aria-labelledby="payment-review-heading" aria-describedby={result ? 'payment-result' : 'payment-readback'} onCancel={e => { e.preventDefault(); if (inFlight.current) { setDialogMessage('Sending is in progress and cannot be canceled now. Wait for the result.'); setRevision(n => n + 1); return; } close(); }}>
      {proposal && <>
        <h2 id="payment-review-heading" ref={heading} tabIndex={-1}>{result ? result.status === 'confirmed' ? 'Payment confirmed' : result.status === 'failed' ? 'Payment failed' : 'Confirmation pending' : 'Review Devnet test payment'}</h2>
        {result ? <>
          <p id="payment-result">{result.status === 'confirmed' ? `${formatSol(proposal.amount)} SOL sent to ${proposal.contactName} on Devnet.` : result.message}</p>
          <p className="wallet-address">{result.signature}</p>
          {result.status === 'confirmed' && <p>Consent receipt recorded on-chain: <span className="wallet-address">{proposal.consentReceipt}</span></p>}
          <a href={`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`} target="_blank" rel="noreferrer">View this payment on Solana Explorer (new tab)</a>
          <div className="wallet-actions">{result.status === 'pending' && <button disabled={busy} onClick={() => void check()}>Check confirmation</button>}<button disabled={busy} onClick={close}>Done</button></div>
        </> : <>
          <p id="payment-readback" className="readback-text">{proposal.readbackText}</p>
          <dl className="payment-details"><dt>Recipient</dt><dd>{proposal.contactName} — verified saved contact</dd><dt>Full address</dt><dd className="wallet-address">{proposal.recipient}</dd><dt>Amount</dt><dd>{formatSol(proposal.amount)} SOL</dd><dt>Network fee</dt><dd>{formatSol(proposal.fee)} SOL</dd><dt>Estimated balance after</dt><dd>{formatSol(proposal.balanceAfter)} SOL</dd><dt>Network</dt><dd>Solana Devnet — test funds only</dd></dl>
          <button disabled={busy} onClick={() => { setDialogMessage(`Full recipient address, spelled with letter case. ${spellAddress(proposal.recipient)}`); setRevision(n => n + 1); }}>Read full address</button>
          <div className="wallet-actions"><button disabled={busy} onClick={() => { setDialogMessage(proposal.readbackText); setRevision(n => n + 1); }}>Repeat details</button><button className="primary" disabled={!busy && !!error} aria-disabled={busy || undefined} onClick={e => void confirm(e)}>{busy ? 'Sending…' : 'Confirm test payment'}</button><button disabled={busy} onClick={close}>{error ? 'Close review' : 'Cancel'}</button></div>
        </>}
        <p role="status" aria-atomic="true"><span key={revision}>{dialogMessage}</span></p>
        {error && <p role="alert" className="error-message">{error}</p>}
      </>}
    </dialog>
  </section>;
}
