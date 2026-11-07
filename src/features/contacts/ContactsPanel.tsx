import { useEffect, useRef, useState } from 'react';
import { listContacts, removeContact, renameContact, saveContact, validateContact } from './service';
import type { Contact } from './service';
import { checkAddressRisk, needsSecondConfirmation, riskWarnings, type AddressRisk } from './risk';

export function ContactsPanel({ announce }: { announce: (text: string) => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [review, setReview] = useState<{ name: string; address: string; existingId?: string; risk?: AddressRisk } | null>(null);
  const [riskAck, setRiskAck] = useState(false);
  const [verified, setVerified] = useState(false);
  const [suffix, setSuffix] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const setMessage = announce;
  const heading = useRef<HTMLHeadingElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const wasReview = useRef(false);
  useEffect(() => {
    let disposed = false;
    listContacts().then(value => { if (!disposed) { setContacts(value); setLoaded(true); } }).catch(() => { if (!disposed) { setLoaded(true); setError('Saved contacts could not be loaded or validated. Existing data has not been changed.'); } });
    return () => { disposed = true; };
  }, []);
  useEffect(() => {
    if (review) heading.current?.focus();
    else if (wasReview.current) nameInput.current?.focus();
    wasReview.current = Boolean(review);
  }, [review]);

  async function save() {
    if (!review || busy) return;
    setBusy(true); setError('');
    try {
      if (review.existingId) await renameContact(review.existingId, name);
      else await saveContact({ name: review.name, address: review.address, independentlyVerified: verified, suffix });
      setContacts(await listContacts()); setMessage(review.existingId ? 'Contact label updated.' : `${review.name} saved after your independent verification.`);
      setReview(null); setName(''); setDestination(''); setVerified(false); setSuffix(''); setRiskAck(false);
    } catch (error) { setError(error instanceof Error ? error.message : 'The contact could not be saved.'); }
    finally { setBusy(false); }
  }

  async function startReview() {
    if (busy) return;
    setError('');
    let checked;
    try { checked = validateContact(name, destination); }
    catch { setError('Enter a name of 1–40 visible characters and a valid Solana public address.'); return; }
    setBusy(true);
    try {
      const risk = await checkAddressRisk(checked.address);
      setReview({ ...checked, risk }); setVerified(false); setSuffix(''); setRiskAck(false);
    } finally { setBusy(false); }
  }

  return <section className="contacts-panel" aria-label="Saved contacts">
    <p className="intro">Only independently verified saved contacts can receive test payments. Solana addresses do not encode a network; check the full address with the recipient for Devnet.</p>
    {!loaded && <p>Loading saved contacts…</p>}
    {loaded && contacts.length === 0 && <p>No saved contacts yet.</p>}
    <ul className="contact-list">{contacts.map(contact => <li key={contact.id}><div><h2>{contact.name}</h2><p className="wallet-address">{contact.address.slice(0, 6)}…{contact.address.slice(-6)}</p><span>Reviewed by you · Devnet</span></div><div className="contact-actions"><button disabled={busy} onClick={() => { setName(contact.name); setReview({ name: contact.name, address: contact.address, existingId: contact.id }); setError(''); }}>Review or rename {contact.name}</button><button disabled={busy} onClick={() => { setBusy(true); setError(''); void removeContact(contact.id).then(() => listContacts()).then(value => { setContacts(value); setMessage(`${contact.name} removed.`); nameInput.current?.focus(); }).catch(() => setError('Contact could not be removed.')).finally(() => setBusy(false)); }}>Remove {contact.name}</button></div></li>)}</ul>
    {review ? <div className="panel"><h2 ref={heading} tabIndex={-1}>{review.existingId ? 'Review saved contact' : 'Verify this recipient independently'}</h2><p>Contact: <strong>{review.name}</strong></p><p className="wallet-address">{review.address}</p><details><summary>Read full address in groups</summary><p className="wallet-address">{review.address.match(/.{1,4}/g)?.join(' ')}</p></details>{review.existingId ? <><label htmlFor="rename-contact">Contact label</label><input id="rename-contact" value={name} onChange={event => setName(event.target.value)} maxLength={40} /><p>Changing a label keeps the reviewed address. To change an address, add and verify a new contact.</p></> : <>{review.risk && riskWarnings(review.risk).length > 0 && <ul className="risk-warnings" aria-label="Address safety check">{riskWarnings(review.risk).map(w => <li key={w}>{w}</li>)}</ul>}{review.risk && !riskWarnings(review.risk).length && <p>Safety check: no lookalike of an address you have used was found. This does not prove who owns the address.</p>}<p>A last-four-character check can catch some errors. It does not verify a person’s identity.</p><label htmlFor="contact-suffix">Type the last four characters of the address</label><input id="contact-suffix" value={suffix} onChange={event => setSuffix(event.target.value)} maxLength={4} autoComplete="off" spellCheck={false} /><label className="checkbox-label"><input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} />I checked the full address with the recipient using an independent source, and confirmed it is for Devnet.</label>{review.risk && needsSecondConfirmation(review.risk) && <label className="checkbox-label"><input type="checkbox" checked={riskAck} onChange={event => setRiskAck(event.target.checked)} />I read the warning above and checked every character of this address with the recipient.</label>}</>}<div className="wallet-actions"><button className="primary" disabled={busy || (!review.existingId && (!verified || suffix !== review.address.slice(-4) || (review.risk !== undefined && needsSecondConfirmation(review.risk) && !riskAck)))} onClick={() => void save()}>{busy ? 'Saving…' : review.existingId ? 'Save label' : 'Save verified contact'}</button><button disabled={busy} onClick={() => { setReview(null); setError(''); }}>Cancel review</button></div></div> : <form className="panel contact-form" onSubmit={event => { event.preventDefault(); void startReview(); }}><h2>Add a Devnet contact</h2><label htmlFor="contact-name">Contact name</label><input ref={nameInput} id="contact-name" value={name} onChange={event => setName(event.target.value)} required maxLength={40} autoComplete="off" /><label htmlFor="contact-address">Paste the recipient’s full Solana address</label><input id="contact-address" value={destination} onChange={event => setDestination(event.target.value)} required autoComplete="off" autoCapitalize="none" spellCheck={false} /><button type="submit" disabled={!loaded || busy}>{busy ? 'Checking address…' : 'Review contact address'}</button></form>}
    {error && <p className="error-message" role="alert">{error}</p>}
  </section>;
}
