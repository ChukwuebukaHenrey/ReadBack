import { useMemo, useState } from 'react';
import { Icon, type IconName } from '../../components/Icon';
import { formatSol } from '../wallet/amount';
import { WalletPanel } from '../wallet/WalletPanel';
import { MAX_TRANSFER, DAILY_LIMIT } from '../transfers/policy';
import type { LedgerEntry } from '../transfers/ledger';
import type { View } from '../../navigation';
import type { WalletSummary } from './useWalletSummary';
import { Avatar } from './Avatar';

const LOW_BALANCE = 100_000_000n;
/** Local calendar day, so a payment at 00:30 in Lagos lands on the day the person lived it. */
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const entryDay = (e: LedgerEntry) => dayKey(new Date(e.createdAt));
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const statusLabel = (e: LedgerEntry) => e.status === 'confirmed' ? 'Confirmed' : e.status === 'failed' ? 'Failed' : 'Pending';
const statusTone = (e: LedgerEntry) => e.status === 'confirmed' ? 'ok' : e.status === 'failed' ? 'bad' : 'warn';

type Props = {
  summary: WalletSummary; incoming: string;
  announce: (text: string) => void; navigate: (view: View) => void;
  sendTo: (contactId: string) => void; explainLast: () => void;
};

export function Dashboard({ summary, incoming, announce, navigate, sendTo, explainLast }: Props) {
  const { wallet, balance, balanceError, entries, contacts, remainingToday, loaded } = summary;
  const [now] = useState(() => Date.now());
  if (!loaded) return <p className="rb-loading">Loading your wallet…</p>;
  if (!wallet) return <div className="rb-onboard"><WalletPanel announce={announce} /></div>;

  const unresolved = entries.filter(e => !['confirmed', 'failed'].includes(e.status));
  const confirmedWeek = entries.filter(e => e.status === 'confirmed' && now - Date.parse(e.createdAt) < 7 * 86_400_000);
  const actions: [IconName, string, () => void][] = [
    ['send', 'Send', () => navigate('transfer')],
    ['receive', 'Receive', () => navigate('wallet')],
    ['chat', 'Explain', explainLast],
    ['contacts', 'Contacts', () => navigate('contacts')],
  ];

  return <div className="rb-dash">
    {unresolved.length > 0 && <div className="rb-banner"><Icon name="activity" size={20} /><p>A payment is still being checked. Don’t send it again.</p><button onClick={() => navigate('activity')}>Check status</button></div>}

    <section className="rb-balance" aria-labelledby="balance-heading">
      <div className="rb-balance-head"><h2 id="balance-heading">Total balance</h2><button className="rb-icon-btn" onClick={summary.refresh} aria-label="Refresh balance"><Icon name="refresh" size={18} /></button></div>
      <p className="rb-balance-value">{balance ? <>{formatSol(balance.lamports)} <span>SOL</span></> : balanceError ? 'Unavailable' : 'Checking…'}</p>
      <p className="rb-balance-meta"><span className="rb-pill">Devnet</span>{balance && <span>Updated {time(balance.checkedAt)}</span>}</p>
      {balance && balance.lamports < LOW_BALANCE && <a className="rb-faucet-link" href={`https://faucet.solana.com/?address=${wallet.address}`} target="_blank" rel="noreferrer">Get test SOL <span className="sr-only">(opens faucet in a new tab)</span><Icon name="external" size={16} /></a>}
      <ul className="rb-actions">{actions.map(([icon, label, run]) => <li key={label}><button onClick={run}><span className="rb-action-icon" aria-hidden="true"><Icon name={icon} size={22} /></span>{label}</button></li>)}</ul>
    </section>

    <section className="rb-stat" aria-labelledby="limit-heading">
      <div className="rb-stat-head"><span className="rb-tile" aria-hidden="true"><Icon name="shield" size={20} /></span><div><h2 id="limit-heading">Daily limit</h2><p>{formatSol(MAX_TRANSFER)} SOL per payment</p></div></div>
      <dl className="rb-stat-meta"><div><dt>Left today</dt><dd>{remainingToday === null ? '—' : `${formatSol(remainingToday)} SOL`}</dd></div><div><dt>Daily cap</dt><dd>{formatSol(DAILY_LIMIT)} SOL</dd></div></dl>
      {remainingToday !== null && <div className="rb-meter" role="img" aria-label={`${formatSol(DAILY_LIMIT - remainingToday)} of ${formatSol(DAILY_LIMIT)} SOL used today`}><span style={{ width: `${Number((DAILY_LIMIT - remainingToday) * 100n / DAILY_LIMIT)}%` }} /></div>}
    </section>

    <section className="rb-stat" aria-labelledby="payments-heading">
      <div className="rb-stat-head"><span className="rb-tile" aria-hidden="true"><Icon name="activity" size={20} /></span><div><h2 id="payments-heading">Payments</h2><p>This week</p></div></div>
      <dl className="rb-stat-meta"><div><dt>Confirmed</dt><dd>{confirmedWeek.length}</dd></div><div><dt>Pending</dt><dd>{unresolved.length}</dd></div></dl>
    </section>

    <WeekChart entries={entries} />

    <section className="rb-card rb-quick" aria-labelledby="quick-heading">
      <h2 id="quick-heading">Quick actions</h2>
      <ul>{([['send', 'Send SOL', 'To a saved contact', () => navigate('transfer')], ['contacts', 'Add contact', 'Verify a new recipient', () => navigate('contacts')], ['chat', 'Explain last payment', 'In plain words', explainLast], ['learn', 'Learn', 'Solana, fees and safety', () => navigate('learn')]] as [IconName, string, string, () => void][]).map(([icon, title, sub, run]) => <li key={title}><button onClick={run}><span className="rb-tile" aria-hidden="true"><Icon name={icon} size={20} /></span><span className="rb-row-text"><strong>{title}</strong><small>{sub}</small></span><Icon name="arrow" size={18} /></button></li>)}</ul>
    </section>

    <section className="rb-card rb-tx" aria-labelledby="tx-heading">
      <div className="rb-card-head"><h2 id="tx-heading">Transactions</h2><button className="rb-link-btn" onClick={() => navigate('activity')}>View all <span className="sr-only">transactions</span></button></div>
      {entries.length === 0 ? <p className="rb-empty">No payments yet.</p> : <ul>{entries.slice(0, 5).map(e => <li key={e.id}>
        <span className="rb-tile" aria-hidden="true"><Icon name="send" size={18} /></span>
        <span className="rb-row-text"><strong>Sent to {e.name}</strong><small>{e.signature ? `Tx ${short(e.signature)}` : 'Not submitted'}</small></span>
        <span className="rb-amount"><strong>−{formatSol(BigInt(e.amount))} SOL</strong><small>{time(e.createdAt)}</small></span>
        <span className={`rb-status ${statusTone(e)}`}>{statusLabel(e)}</span>
      </li>)}</ul>}
    </section>

    <aside className="rb-side" aria-label="More">
      <section className="rb-promo" aria-labelledby="promo-heading">
        <p className="rb-promo-brand"><span aria-hidden="true">◆</span> Readback</p>
        <h2 id="promo-heading">Send test SOL</h2>
        <p>Read back before you confirm.</p>
        <button className="rb-promo-btn" onClick={() => navigate('transfer')}>Send</button>
      </section>
      <PaymentCalendar entries={entries} />
      <section className="rb-card rb-contacts" aria-labelledby="contacts-heading">
        <div className="rb-card-head"><h2 id="contacts-heading">Contacts</h2><button className="rb-add" onClick={() => navigate('contacts')} aria-label="Add contact"><Icon name="plus" size={16} /></button></div>
        {contacts.length === 0 ? <p className="rb-empty">No saved contacts yet.</p> : <ul>{contacts.map(c => <li key={c.id}><button onClick={() => sendTo(c.id)} aria-label={`Send to ${c.name}`}><Avatar seed={c.address} name={c.name} /><span className="rb-row-text"><strong>{c.name}</strong><small>{short(c.address)}</small></span><span className="rb-status ok">Verified</span></button></li>)}</ul>}
      </section>
      {incoming && <p className="rb-incoming"><Icon name="speaker" size={18} />{incoming}</p>}
    </aside>
  </div>;
}

function WeekChart({ entries }: { entries: LedgerEntry[] }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = dayKey(d);
    const total = entries.filter(e => e.status === 'confirmed' && entryDay(e) === key).reduce((s, e) => s + BigInt(e.amount), 0n);
    return { key, label: d.toLocaleDateString([], { weekday: 'short' }), long: d.toLocaleDateString([], { weekday: 'long' }), total, today: i === 6 };
  }), [entries]);
  const week = days.reduce((s, d) => s + d.total, 0n);
  return <section className="rb-card rb-chart" aria-labelledby="chart-heading">
    <div className="rb-card-head"><h2 id="chart-heading">Sent this week</h2><span className="rb-chip">{formatSol(week)} SOL</span></div>
    <ul className="rb-bars">{days.map(d => <li key={d.key} className={d.today ? 'today' : undefined}>
      <span className="rb-bar" style={{ height: `${Math.max(4, Number(d.total * 100n / DAILY_LIMIT))}%` }} aria-hidden="true">{d.total > 0n && d.today && <em>{formatSol(d.total)}</em>}</span>
      <span aria-hidden="true">{d.label.slice(0, 2)}</span><span className="sr-only">{d.long}: {formatSol(d.total)} SOL</span>
    </li>)}</ul>
  </section>;
}

function PaymentCalendar({ entries }: { entries: LedgerEntry[] }) {
  const [offset, setOffset] = useState(0);
  const first = new Date(); first.setDate(1); first.setMonth(first.getMonth() + offset);
  const month = first.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const paid = new Set(entries.filter(e => e.status === 'confirmed').map(entryDay));
  const today = dayKey(new Date());
  const cells: (Date | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(); d++) cells.push(new Date(first.getFullYear(), first.getMonth(), d));
  const weeks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  return <section className="rb-card rb-calendar" aria-labelledby="calendar-heading">
    <h2 id="calendar-heading" className="sr-only">Payment calendar</h2>
    <div className="rb-cal-head"><button className="rb-icon-btn" onClick={() => setOffset(o => o - 1)} aria-label="Previous month"><Icon name="chevron" size={18} /></button><p aria-live="polite">{month}</p><button className="rb-icon-btn next" onClick={() => setOffset(o => o + 1)} aria-label="Next month"><Icon name="chevron" size={18} /></button></div>
    <table><thead><tr>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <th key={i} scope="col" abbr={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]}>{d}</th>)}</tr></thead>
      <tbody>{weeks.map((w, i) => <tr key={i}>{Array.from({ length: 7 }, (_, j) => { const d = w[j]; if (!d) return <td key={j} />; const k = dayKey(d); return <td key={j} className={`${k === today ? 'today' : ''}${paid.has(k) ? ' paid' : ''}`}>{d.getDate()}{paid.has(k) && <span className="sr-only"> payment sent</span>}{k === today && <span className="sr-only"> today</span>}</td>; })}</tr>)}</tbody>
    </table>
  </section>;
}
