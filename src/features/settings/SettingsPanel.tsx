import { useEffect, useRef, useState } from 'react';
import { loadWallet, resetWallet } from '../wallet/service';
import { readLedger } from '../transfers/ledger';
import { speak, speechSupported, stopSpeech, type SpeechSettings } from '../../lib/speech';

export function SettingsPanel({ speech, onSpeechChange, announce, useAI, onUseAIChange }: { speech: SpeechSettings; onSpeechChange: (next: SpeechSettings) => void; announce: (text: string) => void; useAI: boolean; onUseAIChange: (enabled: boolean) => void }) {
  const [hasWallet, setHasWallet] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const supported = speechSupported();

  useEffect(() => { let alive = true; loadWallet().then(w => { if (alive) setHasWallet(Boolean(w)); }).catch(() => undefined); return () => { alive = false; }; }, []);
  useEffect(() => {
    if (!confirming) return;
    const modal = dialog.current;
    modal?.showModal(); heading.current?.focus();
    return () => modal?.close();
  }, [confirming]);

  function closeDialog(message?: string) {
    setConfirming(false); setUnderstood(false);
    if (message) announce(message);
    opener.current?.focus();
  }
  async function reset() {
    if (busy || !understood) return;
    setBusy(true); setError('');
    try {
      const wallet = await loadWallet();
      if (wallet && (await readLedger()).some(e => e.sender === wallet.address && !['confirmed', 'failed'].includes(e.status))) throw new Error('A payment from this wallet is still unresolved. Check Activity before resetting.');
      await resetWallet();
      setHasWallet(false);
      setConfirming(false); setUnderstood(false);
      announce('Demo wallet deleted from this browser. Create a new one from Your Devnet wallet.');
    } catch (e) { setError(e instanceof Error ? e.message : 'The wallet could not be reset. Nothing was deleted.'); }
    finally { setBusy(false); }
  }

  return <section className="settings" aria-label="Settings">
    <div className="panel">
      <h2>Assistant</h2>
      <label className="checkbox-label"><input type="checkbox" checked={useAI} onChange={e => onUseAIChange(e.target.checked)} />Use Groq for requests that local commands don’t recognize</label>
      <p className="field-help">Sends your typed request to Groq. Never your contacts. AI cannot approve payments.</p>
    </div>
    <div className="panel">
      <h2>Speech</h2>
      {!supported && <p>This browser does not support app speech. Your screen reader still reads every update.</p>}
      <label className="checkbox-label"><input type="checkbox" disabled={!supported} checked={speech.enabled} onChange={e => { const next = { ...speech, enabled: e.target.checked }; onSpeechChange(next); if (!next.enabled) stopSpeech(); announce(next.enabled ? 'App speech on.' : 'App speech off.'); }} />Read status updates aloud with app speech</label>
      <label htmlFor="speech-rate">Speech rate</label>
      <select id="speech-rate" disabled={!supported || !speech.enabled} value={String(speech.rate)} onChange={e => onSpeechChange({ ...speech, rate: Number(e.target.value) })}>
        <option value="0.75">Slower</option><option value="1">Normal</option><option value="1.25">Faster</option><option value="1.5">Fastest</option>
      </select>
      <div className="wallet-actions"><button disabled={!supported || !speech.enabled} onClick={() => speak('This is Readback app speech.', speech)}>Test speech</button></div>
    </div>
    <div className="panel">
      <h2>Keyboard</h2>
      <ul>
        <li>Tab and Shift+Tab move between controls. Enter or Space activates a button.</li>
        <li>Escape cancels a payment review. Nothing is sent.</li>
        <li>Payments are confirmed only by pressing Confirm test payment. Typed or spoken “confirm” does nothing.</li>
        <li>Readback adds no global shortcuts, so screen-reader keys keep working.</li>
      </ul>
    </div>
    <div className="panel">
      <h2>Demo wallet</h2>
      <p className="wallet-warning">No backup. Resetting deletes this wallet permanently.</p>
      <button ref={opener} disabled={!hasWallet} onClick={() => { setError(''); setConfirming(true); }}>Reset demo wallet</button>
      {!hasWallet && <p className="field-help">No demo wallet exists in this browser.</p>}
    </div>
    <dialog ref={dialog} className="payment-dialog" aria-labelledby="reset-heading" onCancel={e => { e.preventDefault(); if (!busy) closeDialog('Reset canceled. Your wallet was kept.'); }}>
      {confirming && <>
        <h2 id="reset-heading" ref={heading} tabIndex={-1}>Delete the demo wallet?</h2>
        <p>This permanently deletes the wallet key from this browser. There is no undo and no recovery.</p>
        <label className="checkbox-label"><input type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)} />I understand I will lose access to this wallet and its test SOL.</label>
        <div className="wallet-actions"><button disabled={busy} onClick={() => closeDialog('Reset canceled. Your wallet was kept.')}>Keep wallet</button><button className="primary" disabled={busy || !understood} onClick={() => void reset()}>{busy ? 'Deleting…' : 'Delete wallet'}</button></div>
        {error && <p role="alert" className="error-message">{error}</p>}
      </>}
    </dialog>
  </section>;
}
