import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Avatar } from '../dashboard/Avatar';
import { spellAddress } from '../../lib/spell';

/** Avatar button → wallet menu. "Leave Readback" returns to the landing page; the wallet stays in this browser. */
export function AccountMenu({ address, announce, onSettings, demo = false, onExitDemo }: { address: string | null; announce: (text: string) => void; onSettings: () => void; demo?: boolean; onExitDemo?: () => void }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('button, a')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    const onClick = (e: MouseEvent) => { if (!menu.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey); document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [open]);
  if (!address) return null;
  const close = () => { setOpen(false); button.current?.focus(); };
  async function copy() {
    try { await navigator.clipboard.writeText(address!); announce('Public wallet address copied.'); }
    catch { announce('Copy unavailable. Open Wallet to select the full address.'); }
    close();
  }
  return <div className="rb-account">
    <button ref={button} className="rb-account-btn" aria-expanded={open} aria-controls="account-menu" onClick={() => setOpen(o => !o)}>
      <Avatar seed={address} name="W" size={38} /><span className="rb-account-addr"><span className="sr-only">Wallet address ending </span><span aria-hidden="true">{address.slice(0, 4)}…</span>{address.slice(-4)}</span><Icon name="chevron" size={16} />
    </button>
    <div id="account-menu" ref={menu} className="rb-menu" hidden={!open}>
      <p className="rb-menu-addr">{address}</p>
      <button onClick={() => void copy()}><Icon name="copy" size={18} />Copy address</button>
      <button onClick={() => { announce(`Your address, spelled with letter case. ${spellAddress(address)}`); close(); }}><Icon name="speaker" size={18} />Read address</button>
      {!demo && <a href={`https://explorer.solana.com/address/${address}?cluster=devnet`} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}><Icon name="external" size={18} />View on Explorer<span className="sr-only"> (new tab)</span></a>}
      <button onClick={() => { setOpen(false); onSettings(); }}><Icon name="settings" size={18} />Settings</button>
      {demo ? <button className="rb-menu-leave" onClick={() => { setOpen(false); onExitDemo?.(); }}><Icon name="logout" size={18} />Exit demo</button> : <a href="#" className="rb-menu-leave"><Icon name="logout" size={18} />Leave Readback</a>}
    </div>
  </div>;
}
