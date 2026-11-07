import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { formatSol } from './amount';
import { createWallet, loadWallet, readBalance } from './service';
import type { Balance, PublicWallet } from './service';

export function WalletPanel({ announce }: { announce: (text: string) => void }) {
  const [wallet, setWallet] = useState<PublicWallet | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [balanceError, setBalanceError] = useState('');
  const [balance, setBalance] = useState<Balance | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const setMessage = announce;

  useEffect(() => {
    let disposed = false;
    loadWallet().then(saved => { if (!disposed) { setWallet(saved); setLoaded(true); } }).catch(() => { if (!disposed) { setError('The saved wallet could not be loaded or verified in this browser. Existing data has not been replaced. Use an up-to-date browser with HTTPS and IndexedDB enabled.'); setLoaded(true); } });
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    if (!wallet) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
    readBalance(wallet, signal).then(result => {
      if (!controller.signal.aborted) { setBalance(result); setBalanceError(''); setRefreshing(false); setMessage(`Balance updated: ${formatSol(result.lamports)} SOL on Solana Devnet.`); }
    }).catch(error => {
      if (!controller.signal.aborted) { setBalance(null); setRefreshing(false); setBalanceError(error instanceof Error && error.message.startsWith('Network verification') ? error.message : 'Live balance could not be retrieved. Your saved wallet has not changed. Try refreshing later.'); }
    });
    return () => controller.abort();
  }, [wallet, refresh, setMessage]);

  async function create() {
    if (creating || !acknowledged) return;
    setCreating(true); setError('');
    try { const saved = await createWallet(); setWallet(saved); setMessage('Disposable Devnet wallet saved and verified in this browser.'); }
    catch (error) { setError(error instanceof Error ? error.message : 'Wallet creation failed. Reload to check saved data.'); }
    finally { setCreating(false); }
  }

  async function copyAddress() {
    if (!wallet) return;
    try { await navigator.clipboard.writeText(wallet.address); setMessage('Public wallet address copied.'); }
    catch { setMessage('Copy unavailable. Select and copy the displayed public address.'); }
  }

  return <section className="panel wallet-panel" aria-labelledby="wallet-heading">
    <Icon name="wallet" size={30} /><h2 id="wallet-heading">{wallet ? 'Your disposable test wallet' : 'Your wallet starts here'}</h2>
    <p className="wallet-warning">Solana Devnet only. Test SOL has no monetary value. This wallet has no recovery service; clearing browser data or changing browsers may permanently remove access. Browser scripts can still use a local key, so never use this demo for real funds.</p>
    {!loaded && <p>Checking this browser for a saved wallet…</p>}
    {loaded && !wallet && !error && <><label className="checkbox-label"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />I understand this is a disposable test wallet with no recovery.</label><button className="primary" disabled={!acknowledged || creating} onClick={() => void create()}>{creating ? 'Creating and verifying…' : 'Create disposable Devnet wallet'}</button></>}
    {error && <p role="alert" className="error-message">{error}</p>}
    {wallet && <><div className="balance-block"><span className="balance-label">LIVE DEVNET BALANCE</span><p className="balance-value">{balance ? <>{formatSol(balance.lamports)} <span>SOL</span></> : balanceError ? 'Unavailable' : 'Checking…'}</p>{balance && <p className="balance-provenance">Confirmed commitment · Slot {balance.slot.toString()}<br />Checked {new Date(balance.checkedAt).toLocaleTimeString()}</p>}</div><h3 className="address-heading">Your public address</h3><p className="wallet-address">{wallet.address}</p><div className="wallet-actions"><button onClick={() => void copyAddress()}>Copy address</button><button disabled={refreshing} onClick={() => { setRefreshing(true); setBalance(null); setBalanceError(''); setRefresh(value => value + 1); }}>{refreshing ? 'Refreshing…' : 'Refresh balance'}</button><a className="button secondary" href={`https://faucet.solana.com/?address=${wallet.address}`} target="_blank" rel="noreferrer">Fund with test SOL (new tab) <Icon name="arrow" size={16} /></a></div><p className="persistence-note">Saved and read back from this browser’s IndexedDB. No private key was exported. <a href={`https://explorer.solana.com/address/${wallet.address}?cluster=devnet`} target="_blank" rel="noreferrer">View address on Devnet Explorer (new tab)</a></p></>}
    {balanceError && <p role="alert" className="error-message">{balanceError}</p>}
  </section>;
}
