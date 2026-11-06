import { useEffect, useReducer, useRef, useState } from 'react';
import { capabilities, initialState, location, parseRequest, reducer, views } from './navigation';
import type { Action, View } from './navigation';
import { Brand } from './components/Brand';
import { Icon } from './components/Icon';
import type { IconName } from './components/Icon';
import { topics } from './learning';
import { interpretRequest } from './lib/intent';
import type { Intent } from './lib/intent';
import { WalletPanel } from './features/wallet/WalletPanel';

const viewIcons: Record<View, IconName> = { home: 'home', wallet: 'wallet', contacts: 'contacts', transfer: 'send', activity: 'activity', learn: 'learn' };
const actionCopy: Partial<Record<View, string>> = { wallet: 'Your wallet and test SOL', transfer: 'Review before you approve', activity: 'Understand what happened', learn: 'A little clarity goes a long way' };
const intentViews: Partial<Record<Intent['action'], View>> = { get_balance: 'wallet', list_contacts: 'contacts', prepare_sol_transfer: 'transfer', get_transaction_summary: 'activity', learn_web3: 'learn' };

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [request, setRequest] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [pending, setPending] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    document.title = `${views[state.view]} · Readback`;
    heading.current?.focus();
  }, [state.view]);
  useEffect(() => () => controller.current?.abort(), []);

  function act(action: Action) {
    controller.current?.abort();
    controller.current = null;
    setPending(false);
    setAssistantMessage('');
    dispatch(action);
  }
  const navigate = (view: View) => act({ type: 'navigate', view });

  async function submitRequest() {
    const action = parseRequest(request);
    if (action.type !== 'unknown' || !useAI) { act(action); return; }
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setPending(true);
    setAssistantMessage('Interpreting your request. You can still use navigation.');
    try {
      const intent = await interpretRequest(request, AbortSignal.any([current.signal, AbortSignal.timeout(12000)]));
      if (current.signal.aborted || controller.current !== current) return;
      const view = intentViews[intent.action];
      if (view) {
        if (view === 'learn') setSelectedTopic(intent.topic);
        dispatch({ type: 'navigate', view });
        setAssistantMessage('Request interpreted. No transaction has been created or approved.');
      } else if (intent.action === 'unsupported') {
        dispatch({ type: 'unknown' });
        setAssistantMessage('That request is not supported. Choose an available action below.');
      } else if (intent.action === 'where_am_i' || intent.action === 'what_can_i_do' || intent.action === 'repeat' || intent.action === 'go_back') {
        // AI interpretations may navigate, but cannot repeat or authorize side effects.
        dispatch({ type: 'command', command: intent.action });
        setAssistantMessage('');
      }
    } catch {
      if (!current.signal.aborted && controller.current === current) setAssistantMessage('Assistant unavailable. Use the buttons or try “Where am I?”, “Check balance” or “Explore Web3”.');
    } finally {
      if (controller.current === current) { controller.current = null; setPending(false); }
    }
  }

  return <div className="app">
    <a className="skip" href="#main">Skip to main content</a>
    <header className="app-header"><a className="brand" href="#" aria-label="About Readback"><Brand /></a><p className="network"><span className="status-dot" aria-hidden="true" />Devnet <span className="network-divider">/</span> Test funds only</p><a className="header-help" href="#" >About the project <span aria-hidden="true">↗</span></a></header>
    <div className="app-layout">
      <nav className="app-nav" aria-label="Main navigation"><p className="nav-label">YOUR WORKSPACE</p>{(Object.entries(views) as [View, string][]).map(([view, label]) => <button key={view} aria-current={state.view === view ? 'page' : undefined} onClick={() => navigate(view)}><Icon name={viewIcons[view]} size={20} />{view === 'wallet' ? 'Wallet' : label}</button>)}<div className="nav-note"><Icon name="shield" size={24} /><p>AI interprets.<br />You stay in control.</p><span>Devnet prototype</span></div></nav>
      <main id="main" tabIndex={-1} className="app-main"><div className="breadcrumb">Workspace <span aria-hidden="true">/</span> {views[state.view]}</div>
        <div className="view-heading"><div><p className="eyebrow">{state.view === 'home' ? 'A LITTLE CLARITY GOES A LONG WAY' : 'SOLANA, AT YOUR PACE'}</p><h1 ref={heading} tabIndex={-1}>{state.view === 'home' ? <>What would you<br />like to do?</> : views[state.view]}</h1></div><img className="workspace-mark" src="/assets/readback-mark.png" width="128" height="128" alt="" /></div>
        {state.view === 'home' && <><p className="intro">Your next step starts here. Choose an action or type a request.</p><div className="home-actions">{(['wallet', 'transfer', 'activity', 'learn'] as View[]).map((view, index) => <button key={view} onClick={() => navigate(view)}><div className="action-top"><Icon name={viewIcons[view]} size={26} /><span className="action-number" aria-hidden="true">0{index + 1}</span></div><span className="action-title">{view === 'wallet' ? 'Check balance' : views[view]}</span><span className="action-description">{actionCopy[view]}</span><Icon name="arrow" size={20} /></button>)}</div></>}
        {state.view === 'wallet' && <WalletPanel />}
        {state.view === 'contacts' && <section className="panel empty-state"><Icon name="contacts" size={36} /><h2>No saved contacts</h2><p>Adding contacts is not available yet. Before payments are enabled, each pasted address must be reviewed and independently verified.</p></section>}
        {state.view === 'transfer' && <section className="panel empty-state"><Icon name="shield" size={36} /><h2>Payments are not available yet</h2><p>A payment will require a wallet, a verified saved contact, an exact amount, fee checks, simulation and your explicit approval.</p><button onClick={() => navigate('contacts')}>View saved contacts <Icon name="arrow" size={18} /></button></section>}
        {state.view === 'activity' && <section className="panel empty-state"><Icon name="activity" size={36} /><h2>No wallet connected</h2><p>Transaction history has not been retrieved. Once the live wallet is implemented, this page will show actual Devnet activity and distinguish pending from confirmed transactions.</p></section>}
        {state.view === 'learn' && <section className="learning" aria-label="Learning topics"><p className="intro">A few clear explanations to get you started. Learning never executes transactions.</p>{topics.map(topic => <details key={topic.id} open={selectedTopic === topic.id} onToggle={event => { if (event.currentTarget.open) setSelectedTopic(topic.id); else setSelectedTopic(current => current === topic.id ? null : current); }}><summary>{topic.title}</summary><p>{topic.text}</p></details>)}</section>}
        <section className="request panel" aria-labelledby="request-heading"><div className="section-label"><Icon name="keyboard" size={22} /><span>YOUR CONTEXT ASSISTANT</span></div><h2 id="request-heading">A question is a good place to start.</h2><form onSubmit={event => { event.preventDefault(); void submitRequest(); }}><label htmlFor="request">Type a request</label><div className="input-row"><input id="request" value={request} onChange={event => setRequest(event.target.value)} aria-describedby="request-help" required maxLength={500} autoComplete="off" placeholder="Where am I? What can I do?" /><button className="primary" type="submit">{pending ? 'New request' : 'Submit request'}<Icon name="arrow" size={18} /></button></div><p id="request-help" className="field-help">Try “Check balance” or “Explore Web3”. Local commands always work without AI.</p><label className="checkbox-label"><input type="checkbox" checked={useAI} onChange={event => { setUseAI(event.target.checked); if (!event.target.checked) { controller.current?.abort(); controller.current = null; setPending(false); setAssistantMessage('Assistant off. Local navigation is available.'); } }} />Use Groq for requests that local commands don’t recognize</label><p className="privacy-note">When enabled, only your typed request is sent to Groq. Don’t include secrets or private information. AI cannot approve payments.</p></form><div role="status" aria-atomic="true">{assistantMessage && <p className="assistant-message">{assistantMessage}</p>}</div>{pending && <button onClick={() => { controller.current?.abort(); controller.current = null; setPending(false); setAssistantMessage('Request canceled.'); }}>Cancel request</button>}</section>
        <section className="context" aria-labelledby="context-heading"><div><h2 id="context-heading">Right here, right now.</h2><p>{location(state.view)}</p></div><div className="context-actions">{capabilities.map(capability => <button key={capability.id} onClick={() => act({ type: 'command', command: capability.id })}>{capability.label}</button>)}</div><p className="last-announcement">{state.announcement}</p></section>
      </main>
    </div>
    <div className="sr-only" role="status" aria-atomic="true"><span key={state.revision}>{state.announcement}</span></div>
    <footer className="app-footer"><span>Readback · An accessibility-first experiment.</span><span>Speech output off <span aria-hidden="true">·</span> Microphone off <span aria-hidden="true">·</span> No real funds</span></footer>
  </div>;
}
