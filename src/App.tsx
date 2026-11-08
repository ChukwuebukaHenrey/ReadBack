import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { durations, ease } from './lib/motion';
import { capabilities, initialState, parseRequest, reducer, views } from './navigation';
import type { Action, View } from './navigation';
import { Brand } from './components/Brand';
import { Icon } from './components/Icon';
import type { IconName } from './components/Icon';
import { topics } from './learning';
import { interpretRequest, fallbackIntent } from './lib/intent';
import type { Intent, Slots } from './lib/intent';
import { WalletPanel } from './features/wallet/WalletPanel';
import { Dashboard } from './features/dashboard/Dashboard';
import { useWalletSummary } from './features/dashboard/useWalletSummary';
import { AccountMenu } from './features/wallet/AccountMenu';
import { endDemo, isDemo, profileName } from './features/demo/demo';
import { useDisplayPrefs } from './lib/display';
import { ContactsPanel } from './features/contacts/ContactsPanel';
import { listContacts } from './features/contacts/service';
import { nameKey } from './features/contacts/names';
import { TransferPanel, type TransferDraft } from './features/transfers/TransferPanel';
import { ActivityPanel } from './features/activity/ActivityPanel';
import { parseAmount } from './features/transfers/policy';
import { availableActionsText } from './capabilityRegistry';
import { explainRefusal, refusalTemplate, type RefusalFact } from './lib/refusals';
import { SettingsPanel } from './features/settings/SettingsPanel';
import { useIncomingPayments } from './features/wallet/IncomingWatcher';
import { readLedger } from './features/transfers/ledger';
import { loadWallet } from './features/wallet/service';
import { explainEntry } from './features/activity/explain';
import { loadSpeech, saveSpeech, speak, type SpeechSettings } from './lib/speech';

const viewIcons: Record<View, IconName> = { home: 'home', wallet: 'wallet', contacts: 'contacts', transfer: 'send', activity: 'activity', learn: 'learn', settings: 'settings' };
const navOrder: View[] = ['home', 'wallet', 'transfer', 'activity', 'contacts', 'learn', 'settings'];
const intentViews: Partial<Record<Intent['action'], View>> = { balance: 'wallet', list_contacts: 'contacts', activity: 'activity', explain_last: 'activity', learn_web3: 'learn' };

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [request, setRequest] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [pending, setPending] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slots | undefined>();
  const [followups, setFollowups] = useState(0);
  const [draft, setDraft] = useState<TransferDraft>();
  const [refusal, setRefusal] = useState('');
  const [statusRevision, setStatusRevision] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const controller = useRef<AbortController | null>(null);
  const draftCounter = useRef(0);
  const [speech, setSpeech] = useState<SpeechSettings>(loadSpeech);
  const [display, setDisplay] = useDisplayPrefs();
  const changeSpeech = (next: SpeechSettings) => { setSpeech(next); saveSpeech(next); };
  const statusText = assistantMessage || state.announcement;
  useEffect(() => { speak(statusText, speech); }, [statusText, state.revision, statusRevision, speech]);

  const shownView = useRef(state.view);
  useEffect(() => {
    document.title = `${views[state.view]} · Readback`;
    // Move focus only when the view changes, never on first load: the skip link and header come first.
    if (shownView.current === state.view) return;
    shownView.current = state.view;
    heading.current?.focus();
  }, [state.view]);
  useEffect(() => () => controller.current?.abort(), []);

  function act(action: Action) {
    controller.current?.abort();
    controller.current = null;
    setPending(false);
    setAssistantMessage('');
    setRefusal(''); setSlots(undefined); setFollowups(0);
    dispatch(action);
  }
  const navigate = (view: View) => act({ type: 'navigate', view });

  const announce = useCallback((text: string) => { setAssistantMessage(text); setStatusRevision(n => n + 1); }, []);
  const incoming = useIncomingPayments(announce);
  const summary = useWalletSummary(`${incoming}|${state.view}`);
  const [askOpen, setAskOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  function sendTo(contactId: string) {
    draftCounter.current += 1;
    setDraft({ contactId, amountText: '', requestId: draftCounter.current });
    navigate('transfer');
  }
  async function explainLatest(signal: AbortSignal) {
    const [records, wallet] = await Promise.all([readLedger(), loadWallet()]);
    const latest = records.filter(e => e.sender === wallet?.address).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (signal.aborted) return;
    if (!latest) { announce('No payments yet, so there is nothing to explain.'); return; }
    const text = await explainEntry(latest, useAI, signal);
    if (!signal.aborted) announce(text);
  }
  async function refuse(reason: RefusalFact['reason'], signal: AbortSignal) {
    const fact: RefusalFact = { reason, limit: '0.5' };
    setRefusal(refusalTemplate(fact)); setSlots(undefined); setFollowups(0); setAssistantMessage('');
    if (useAI && !signal.aborted) {
      try { const explanation = await explainRefusal(fact, signal); if (!signal.aborted) setRefusal(explanation); } catch { /* Fixed explanation stays available. */ }
    }
  }
  async function applyIntent(intent: Intent, signal: AbortSignal) {
    if (intent.action === 'send') {
      const next = { ...slots, ...(intent.amountText ? { amountText: intent.amountText } : {}), ...(intent.contactName ? { contactName: intent.contactName } : {}) };
      if (next.amountText) { try { parseAmount(next.amountText); } catch { await refuse('amount', signal); return; } }
      let contact;
      if (next.contactName) {
        if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(next.contactName)) { await refuse('unknown_contact', signal); return; }
        try { const key = nameKey(next.contactName); contact = (await listContacts()).find(c => c.normalizedName === key); } catch { await refuse('unknown_contact', signal); return; }
        if (signal.aborted) return;
        if (!contact) { await refuse('unknown_contact', signal); return; }
      }
      if (!next.amountText || !contact) {
        if (followups >= 3) { setSlots(undefined); setFollowups(0); announce('Let’s start again. Choose a saved contact and amount in the Send SOL form.'); return; }
        setSlots(next); setFollowups(n => n + 1);
        announce(!next.amountText ? 'How much SOL? Enter an exact amount, up to 0.5 SOL.' : 'Which saved contact should receive the payment?');
        return;
      }
      setSlots(undefined); setFollowups(0);
      draftCounter.current += 1;
      setDraft({ contactId: contact.id, amountText: next.amountText, requestId: draftCounter.current });
      dispatch({ type: 'navigate', view: 'transfer' });
      announce('Your request filled the payment form. Check the contact and amount, then choose Review payment. Nothing has been approved.');
      return;
    }
    setSlots(undefined); setFollowups(0);
    if (intent.action === 'unsupported') { await refuse('unsupported', signal); return; }
    if (intent.action === 'help') { announce(availableActionsText()); return; }
    if (intent.action === 'explain_last') {
      dispatch({ type: 'navigate', view: 'activity' });
      await explainLatest(signal);
      return;
    }
    const view = intentViews[intent.action];
    if (view) {
      if (view === 'learn') setSelectedTopic(intent.topic ?? 'solana');
      dispatch({ type: 'navigate', view }); setAssistantMessage(''); return;
    }
    if (intent.action === 'repeat') { if (refusal) setAssistantMessage(refusal); setStatusRevision(n => n + 1); dispatch({ type: 'command', command: 'repeat' }); return; }
    if (intent.action === 'where_am_i' || intent.action === 'what_can_i_do' || intent.action === 'go_back') { setAssistantMessage(''); dispatch({ type: 'command', command: intent.action }); }
  }

  async function submitRequest(text: string = request) {
    if (text !== request) setRequest(text);
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setPending(true); setRefusal('');
    const signal = AbortSignal.any([current.signal, AbortSignal.timeout(10000)]);
    try {
      let intent = fallbackIntent(text, slots);
      if (!intent) {
        const action = parseRequest(text);
        if (action.type !== 'unknown' && !slots) { act(action); return; }
        if (useAI) {
          announce('Interpreting your request. You can still use navigation.');
          try { intent = await interpretRequest(text, signal, slots); }
          catch { intent = fallbackIntent(text, slots); }
        }
      }
      if (current.signal.aborted || controller.current !== current) return;
      if (!intent) { await refuse('unclear', current.signal); return; }
      await applyIntent(intent, current.signal);
    } catch {
      if (!current.signal.aborted && controller.current === current) setRefusal('The request could not be completed. Use the Send SOL form or navigation buttons. Nothing was approved.');
    } finally {
      if (controller.current === current) { controller.current = null; setPending(false); }
    }
  }

  const demo = isDemo();
  const name = profileName();
  const exitDemo = () => { endDemo(); window.location.hash = '#login'; };
  const dashTitle = state.view === 'home' ? (name ? `Welcome back, ${name}` : 'Welcome back') : views[state.view];
  const tabs: View[] = ['home', 'activity', 'transfer', 'contacts'];
  const pendingCount = summary.entries.filter(e => !['confirmed', 'failed'].includes(e.status)).length;
  return <div className={`rb-app${display.largeText ? ' rb-large' : ''}${display.contrast ? ' rb-contrast' : ''}`}>
    <a className="skip" href="#app" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to main content</a>
    <div className="rb-sidebar">
      <header className="rb-brandbar"><a className="brand" href="#" aria-label="Readback home"><Brand /></a><p className="rb-network">Devnet</p></header>
      <nav className="rb-nav" aria-label="Main navigation">{navOrder.map(view => <button key={view} aria-current={state.view === view ? 'page' : undefined} onClick={() => navigate(view)}>{state.view === view && <motion.span layoutId="rb-nav-pill" className="rb-nav-pill" transition={{ duration: durations.ui + 0.05, ease }} aria-hidden="true" />}<Icon name={viewIcons[view]} size={20} />{views[view]}{view === 'activity' && pendingCount > 0 && <span className="rb-badge"><span className="sr-only">, </span>{pendingCount}<span className="sr-only"> pending</span></span>}</button>)}</nav>
      {summary.wallet && !demo && <a className="rb-side-card" href={`https://faucet.solana.com/?address=${summary.wallet.address}`} target="_blank" rel="noreferrer"><span className="rb-side-arrow" aria-hidden="true"><Icon name="external" size={18} /></span><span>Get test SOL</span><span className="sr-only"> (opens faucet in a new tab)</span></a>}
    </div>
    <main id="main" tabIndex={-1} className={`rb-main view-${state.view}`}>
      <div className="rb-top">
        <h1 ref={heading} tabIndex={-1}>{dashTitle}</h1>
        <span className="rb-net-pill">Devnet</span>
        <form className={`rb-ask${askOpen ? ' open' : ''}`} role="search" onSubmit={event => { event.preventDefault(); void submitRequest(); }}>
          <label htmlFor="request" className="sr-only">Type a request</label>
          <Icon name="chat" size={18} />
          <input id="request" value={request} onChange={event => setRequest(event.target.value)} required maxLength={300} autoComplete="off" placeholder="Ask Readback" />
          <button type="submit" aria-label={pending ? 'New request' : 'Submit request'}><Icon name="arrow" size={18} /></button>
        </form>
        <button className="rb-icon-btn rb-ask-toggle" aria-expanded={askOpen} aria-label="Ask Readback" onClick={() => { setAskOpen(o => !o); requestAnimationFrame(() => document.getElementById('request')?.focus()); }}><Icon name="chat" size={20} /></button>
        <AccountMenu address={summary.wallet?.address ?? null} announce={announce} onSettings={() => navigate('settings')} demo={demo} onExitDemo={exitDemo} />
      </div>
      {demo && <div className="rb-demo"><Icon name="spark" size={20} /><p><strong>Demo account.</strong> Fictional data. Nothing is sent to Solana.</p><button onClick={exitDemo}>Exit demo</button></div>}
      <div role="alert" aria-atomic="true" className="rb-alert">{refusal && <p className="error-message">{refusal}</p>}</div>
      {pending && <button className="rb-cancel" onClick={() => { controller.current?.abort(); controller.current = null; setPending(false); setAssistantMessage('Request canceled.'); }}>Cancel request</button>}
      {state.view === 'home' && <Dashboard summary={summary} incoming={incoming} announce={announce} navigate={navigate} sendTo={sendTo} explainLast={() => { void explainLatest(new AbortController().signal); }} onAsk={text => void submitRequest(text)} speech={speech} onSpeechChange={changeSpeech} display={display} onDisplayChange={setDisplay} />}
      {state.view === 'wallet' && <WalletPanel announce={announce} />}
      {state.view === 'contacts' && <ContactsPanel announce={announce} />}
      {state.view === 'transfer' && <TransferPanel key={draft?.requestId ?? 'manual'} draft={draft} announce={announce} />}
      {state.view === 'activity' && <ActivityPanel announce={announce} useAI={useAI} />}
      {state.view === 'settings' && <SettingsPanel speech={speech} onSpeechChange={changeSpeech} display={display} onDisplayChange={setDisplay} announce={announce} useAI={useAI} onUseAIChange={enabled => { setUseAI(enabled); if (!enabled) { controller.current?.abort(); controller.current = null; setPending(false); setAssistantMessage('Assistant off. Local navigation is available.'); } }} />}
      {state.view === 'learn' && <section className="learning rb-card" aria-label="Learning topics">{topics.map(topic => <details key={topic.id} open={selectedTopic === topic.id} onToggle={event => { if (event.currentTarget.open) setSelectedTopic(topic.id); else setSelectedTopic(current => current === topic.id ? null : current); }}><summary>{topic.title}</summary><p>{topic.text}</p></details>)}</section>}
      <section className="rb-context" aria-label="Orientation">
        <div className="context-actions">{capabilities.map(capability => <button key={capability.id} onClick={() => { if (capability.id === 'repeat') { if (refusal) { setAssistantMessage(refusal); setRefusal(''); } setStatusRevision(n => n + 1); } else act({ type: 'command', command: capability.id }); }}>{capability.label}</button>)}</div>
        <p className="last-announcement" role="status" aria-atomic="true"><span key={`${state.revision}-${statusRevision}`}>{assistantMessage || state.announcement}</span></p>
      </section>
    </main>
    <nav className="rb-tabbar" aria-label="Tab navigation">
      {tabs.map(view => <button key={view} className={view === 'transfer' ? 'rb-tab-main' : undefined} aria-current={state.view === view ? 'page' : undefined} onClick={() => { setMoreOpen(false); navigate(view); }}><Icon name={viewIcons[view]} size={view === 'transfer' ? 26 : 22} /><span className={view === 'transfer' ? 'sr-only' : undefined}>{view === 'home' ? 'Home' : views[view]}</span></button>)}
      <button aria-expanded={moreOpen} aria-controls="more-sheet" aria-current={['wallet', 'learn', 'settings'].includes(state.view) ? 'page' : undefined} onClick={() => setMoreOpen(o => !o)}><Icon name="menu" size={22} /><span>More</span></button>
      <div id="more-sheet" className="rb-more" hidden={!moreOpen}>{(['wallet', 'learn', 'settings'] as View[]).map(view => <button key={view} onClick={() => { setMoreOpen(false); navigate(view); }}><Icon name={viewIcons[view]} size={20} />{views[view]}</button>)}</div>
    </nav>
  </div>;
}
