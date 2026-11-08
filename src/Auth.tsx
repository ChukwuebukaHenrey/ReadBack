import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Brand } from './components/Brand';
import { Icon } from './components/Icon';
import { createWallet, loadWallet, type PublicWallet } from './features/wallet/service';
import { endDemo, isDemo, saveProfileName, startDemo } from './features/demo/demo';
import { durations, ease } from './lib/motion';
import './auth.css';

type Mode = 'login' | 'signup';
const art: Record<Mode, { src: string; title: string; line: string; step: number }> = {
  login: { src: '/assets/auth/clear-entry.png', title: 'Clear entry', line: 'Pick up where you left off. Every action stays readable.', step: 0 },
  signup: { src: '/assets/auth/guided-setup.png', title: 'Guided setup', line: 'Create your test wallet step by step. Each choice is explained first.', step: 1 },
};
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export function Auth({ mode }: { mode: Mode }) {
  const [wallet, setWallet] = useState<PublicWallet | null | undefined>(undefined);

  useEffect(() => {
    document.title = `${mode === 'login' ? 'Log in' : 'Sign up'} · Readback`;
    let alive = true;
    // The demo is a separate session; the auth pages always describe the real browser wallet.
    if (isDemo()) endDemo();
    loadWallet().then(w => { if (alive) setWallet(w); }).catch(() => { if (alive) setWallet(null); });
    return () => { alive = false; };
  }, [mode]);

  function tryDemo() { startDemo(); window.location.hash = '#app'; }

  const a = art[mode];
  return <div className="auth">
    <a className="skip" href="#auth-main" onClick={e => { e.preventDefault(); document.getElementById('auth-main')?.focus(); }}>Skip to main content</a>
    <aside className="auth-art" aria-hidden="true">
      <a className="auth-art-brand" href="#" tabIndex={-1}><Brand /></a>
      <div className="auth-bars">{[0, 1, 2].map(i => <span key={i} className={i === a.step ? 'on' : undefined} />)}</div>
      <AnimatePresence mode="wait">
        <motion.div key={mode} className="auth-art-body" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: durations.surface, ease }}>
          <p className="auth-art-title">{a.title}</p>
          <img src={a.src} alt="" width="565" height="460" />
          <p className="auth-art-line">{a.line}</p>
        </motion.div>
      </AnimatePresence>
    </aside>

    <main id="auth-main" tabIndex={-1} className="auth-main">
      <header className="auth-top"><a href="#" className="brand" aria-label="Readback home"><Brand tone="dark" /></a><a href="#" className="auth-back"><Icon name="arrow" size={16} />Back to site</a></header>
      <AnimatePresence mode="wait">
        <motion.section key={mode} className="auth-panel" aria-labelledby="auth-heading" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: durations.surface, ease }}>
          <img className="auth-mobile-art" src={a.src} alt="" width="565" height="460" />
          <FocusHeading>{mode === 'login' ? 'Welcome back' : 'Create your wallet'}</FocusHeading>

          {mode === 'login' ? <>
            {wallet === undefined && <p className="auth-muted">Checking this browser…</p>}
            {wallet && <div className="auth-wallet"><span className="auth-wallet-icon" aria-hidden="true"><Icon name="wallet" size={22} /></span><span><strong>Test wallet</strong><small><span className="sr-only">Address ending </span><span aria-hidden="true">{short(wallet.address)}</span><span className="sr-only">{wallet.address.slice(-4)}</span></small></span></div>}
            {wallet && <a className="auth-primary" href="#app">Continue <Icon name="arrow" size={18} /></a>}
            {wallet === null && <>
              <p className="auth-muted">There’s no Readback wallet in this browser yet.</p>
              <a className="auth-primary" href="#signup">Create a wallet <Icon name="arrow" size={18} /></a>
            </>}
          </> : <>
            {wallet ? <>
              <p className="auth-muted">This browser already has a test wallet ending {wallet.address.slice(-4)}.</p>
              <a className="auth-primary" href="#app">Continue <Icon name="arrow" size={18} /></a>
            </> : <SignupForm />}
          </>}

          <div className="auth-or"><span>or</span></div>
          <button type="button" className="auth-demo" onClick={tryDemo}><Icon name="spark" size={20} /><span><strong>Try the demo</strong><small>Fictional account. Nothing is sent.</small></span></button>

          <p className="auth-switch">{mode === 'login' ? <>New here? <a href="#signup">Create a wallet</a></> : <>Already have a wallet? <a href="#login">Log in</a></>}</p>
          <p className="auth-note"><Icon name="lock" size={16} />No passwords. Your test wallet’s key stays in this browser.</p>
        </motion.section>
      </AnimatePresence>
    </main>
  </div>;
}

/** Takes focus when it mounts, so it works after the page transition swaps panels. */
function FocusHeading({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <h1 id="auth-heading" ref={ref} tabIndex={-1}>{children}</h1>;
}

/** Its own component so the acknowledgement starts unticked every time sign-up opens. */
function SignupForm() {
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function create() {
    if (busy || !agreed) return;
    setBusy(true); setError('');
    try { await createWallet(); saveProfileName(name); window.location.hash = '#app'; }
    catch (e) { setError(e instanceof Error ? e.message : 'The wallet could not be created. Nothing was saved.'); }
    finally { setBusy(false); }
  }
  return <form className="auth-form" onSubmit={e => { e.preventDefault(); void create(); }}>
              <label htmlFor="auth-name">What should we call you? <span className="auth-optional">Optional</span></label>
              <input id="auth-name" value={name} onChange={e => setName(e.target.value)} maxLength={40} autoComplete="nickname" />
              <label className="auth-check"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} required />I understand this is a Devnet test wallet with no backup. Clearing browser data removes it.</label>
              <button type="submit" className="auth-primary" disabled={!agreed} aria-disabled={busy || undefined}>{busy ? 'Creating…' : 'Create wallet'} <Icon name="arrow" size={18} /></button>
              {error && <p role="alert" className="auth-error">{error}</p>}
            </form>;
}
