import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { capabilities, initialState, location, parseRequest, reducer, views } from './navigation';
import type { Action, View } from './navigation';
import { Brand } from './components/Brand';
import { Icon } from './components/Icon';
import type { IconName } from './components/Icon';
import { topics } from './learning';
import { interpretRequest, fallbackIntent } from './lib/intent';
import type { Intent, Slots } from './lib/intent';
import { WalletPanel } from './features/wallet/WalletPanel';
import { ContactsPanel } from './features/contacts/ContactsPanel';
import { listContacts } from './features/contacts/service';
import { nameKey } from './features/contacts/names';
import { TransferPanel, type TransferDraft } from './features/transfers/TransferPanel';
import { ActivityPanel } from './features/activity/ActivityPanel';
import { parseAmount } from './features/transfers/policy';
import { DailyLimitSummary } from './features/transfers/DailyLimitSummary';
import { availableActionsText } from './capabilityRegistry';
import { explainRefusal, refusalTemplate, type RefusalFact } from './lib/refusals';
import { SettingsPanel } from './features/settings/SettingsPanel';
import { HeaderWallet } from './features/wallet/HeaderWallet';
import { useIncomingPayments } from './features/wallet/IncomingWatcher';
import { readLedger } from './features/transfers/ledger';
import { loadWallet } from './features/wallet/service';
import { explainEntry } from './features/activity/explain';
import { loadSpeech, saveSpeech, speak, type SpeechSettings } from './lib/speech';

const viewIcons: Record<View, IconName> = { home: 'home', wallet: 'wallet', contacts: 'contacts', transfer: 'send', activity: 'activity', learn: 'learn', settings: 'settings' };
const actionCopy: Partial<Record<View, string>> = { wallet: 'Your wallet and test SOL', transfer: 'Review before you approve', activity: 'Understand what happened', learn: 'A little clarity goes a long way' };
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
      const [records, wallet] = await Promise.all([readLedger(), loadWallet()]);
      const latest = records.filter(e => e.sender === wallet?.address).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (signal.aborted) return;
      if (!latest) { announce('No payments yet, so there is nothing to explain. Try “Send 0.1 SOL to Mum”.'); return; }
      const text = await explainEntry(latest, useAI, signal);
      if (!signal.aborted) announce(text);
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

  async function submitRequest() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setPending(true); setRefusal('');
    const signal = AbortSignal.any([current.signal, AbortSignal.timeout(10000)]);
    try {
      let intent = fallbackIntent(request, slots);
      if (!intent) {
        const action = parseRequest(request);
        if (action.type !== 'unknown' && !slots) { act(action); return; }
        if (useAI) {
          announce('Interpreting your request. You can still use navigation.');
          try { intent = await interpretRequest(request, signal, slots); }
          catch { intent = fallbackIntent(request, slots); }
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

  return <div className="app">
    <a className="skip" href="#app" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to main content</a>
    <header className="app-header"><a className="brand" href="#" aria-label="About Readback"><Brand /></a><p className="network"><span className="status-dot" aria-hidden="true" />Devnet <span className="network-divider">/</span> Test funds only</p><HeaderWallet announce={announce} /><a className="header-help" href="#" >About the project <span aria-hidden="true">↗</span></a></header>
    <div className="app-layout">
      <nav className="app-nav" aria-label="Main navigation"><p className="nav-label">YOUR WORKSPACE</p>{(Object.entries(views) as [View, string][]).map(([view, label]) => <button key={view} aria-current={state.view === view ? 'page' : undefined} onClick={() => navigate(view)}><Icon name={viewIcons[view]} size={20} />{view === 'wallet' ? 'Wallet' : label}</button>)}<div className="nav-note"><Icon name="shield" size={24} /><p>AI interprets.<br />You stay in control.</p><span>Devnet prototype</span></div></nav>
      <main id="main" tabIndex={-1} className="app-main"><div className="breadcrumb">Workspace <span aria-hidden="true">/</span> {views[state.view]}</div>
        <div className="view-heading"><div><p className="eyebrow">{state.view === 'home' ? 'A LITTLE CLARITY GOES A LONG WAY' : 'SOLANA, AT YOUR PACE'}</p><h1 ref={heading} tabIndex={-1}>{state.view === 'home' ? <>What would you<br />like to do?</> : views[state.view]}</h1></div><img className="workspace-mark" src="/assets/readback-mark.png" width="128" height="128" alt="" /></div>
        {state.view === 'home' && <><WalletPanel announce={announce} /><DailyLimitSummary />{incoming && <p className="wallet-warning"><strong>Latest incoming payment:</strong> {incoming}</p>}</>}
        {state.view === 'home' && <><p className="intro">Your next step starts here. Choose an action or type a request.</p><div className="home-actions">{(['wallet', 'transfer', 'activity', 'learn'] as View[]).map((view, index) => <button key={view} onClick={() => navigate(view)}><div className="action-top"><Icon name={viewIcons[view]} size={26} /><span className="action-number" aria-hidden="true">0{index + 1}</span></div><span className="action-title">{view === 'wallet' ? 'Check balance' : views[view]}</span><span className="action-description">{actionCopy[view]}</span><Icon name="arrow" size={20} /></button>)}</div></>}
        {state.view === 'home' && <ActivityPanel announce={announce} compact />}
        {state.view === 'wallet' && <WalletPanel announce={announce} />}
        {state.view === 'contacts' && <ContactsPanel announce={announce} />}
        {state.view === 'transfer' && <TransferPanel key={draft?.requestId ?? 'manual'} draft={draft} announce={announce} />}
        {state.view === 'activity' && <ActivityPanel announce={announce} useAI={useAI} />}
        {state.view === 'settings' && <SettingsPanel speech={speech} onSpeechChange={next => { setSpeech(next); saveSpeech(next); }} announce={announce} />}
        {state.view === 'learn' && <section className="learning" aria-label="Learning topics"><p className="intro">A few clear explanations to get you started. Learning never executes transactions.</p>{topics.map(topic => <details key={topic.id} open={selectedTopic === topic.id} onToggle={event => { if (event.currentTarget.open) setSelectedTopic(topic.id); else setSelectedTopic(current => current === topic.id ? null : current); }}><summary>{topic.title}</summary><p>{topic.text}</p></details>)}</section>}
        <section className="request panel" aria-labelledby="request-heading"><div className="section-label"><Icon name="keyboard" size={22} /><span>YOUR CONTEXT ASSISTANT</span></div><h2 id="request-heading">A question is a good place to start.</h2><form onSubmit={event => { event.preventDefault(); void submitRequest(); }}><label htmlFor="request">Type a request</label><div className="input-row"><input id="request" value={request} onChange={event => setRequest(event.target.value)} aria-describedby="request-help" required maxLength={300} autoComplete="off" placeholder="Where am I? What can I do?" /><button className="primary" type="submit">{pending ? 'New request' : 'Submit request'}<Icon name="arrow" size={18} /></button></div><p id="request-help" className="field-help">Try “Check balance” or “Explore Web3”. Local commands always work without AI.</p><label className="checkbox-label"><input type="checkbox" checked={useAI} onChange={event => { setUseAI(event.target.checked); if (!event.target.checked) { controller.current?.abort(); controller.current = null; setPending(false); setAssistantMessage('Assistant off. Local navigation is available.'); } }} />Use Groq for requests that local commands don’t recognize</label><p className="privacy-note">When enabled, your typed request, missing-field flags and fixed refusal facts may be sent to Groq. Your saved contact list is never sent. Don’t include secrets or private information. AI cannot approve payments.</p></form><div role="alert" aria-atomic="true">{refusal && <p className="error-message">{refusal}</p>}</div>{pending && <button onClick={() => { controller.current?.abort(); controller.current = null; setPending(false); setAssistantMessage('Request canceled.'); }}>Cancel request</button>}</section>
        <section className="context" aria-labelledby="context-heading"><div><h2 id="context-heading">Right here, right now.</h2><p>{location(state.view)}</p></div><div className="context-actions">{capabilities.map(capability => <button key={capability.id} onClick={() => { if (capability.id === 'repeat') { if (refusal) { setAssistantMessage(refusal); setRefusal(''); } setStatusRevision(n => n + 1); } else act({ type: 'command', command: capability.id }); }}>{capability.label}</button>)}</div><p className="last-announcement" role="status" aria-atomic="true"><span key={`${state.revision}-${statusRevision}`}>{assistantMessage || state.announcement}</span></p></section>
      </main>
    </div>
    <footer className="app-footer"><span>Readback · An accessibility-first experiment.</span><span>Speech output off <span aria-hidden="true">·</span> Microphone off <span aria-hidden="true">·</span> No real funds</span></footer>
  </div>;
}
