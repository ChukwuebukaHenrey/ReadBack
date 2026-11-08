import { Icon } from './components/Icon';
import type { IconName } from './components/Icon';
import { SiteNav } from './SiteNav';
import './landing.css';

const github = 'https://github.com/ChukwuebukaHenrey/ReadBack';
const soups = 'https://arxiv.org/pdf/2306.06261';

function Pill({ icon, children }: { icon: IconName; children: string }) {
  return <p className="lp-pill"><Icon name={icon} size={15} />{children}</p>;
}
function Check({ children }: { children: string }) {
  return <li><span className="lp-check" aria-hidden="true"><Icon name="check" size={14} /></span>{children}</li>;
}

const details: { icon: IconName; title: string; copy: string }[] = [
  { icon: 'keyboard', title: 'Typed requests', copy: 'Ask in your own words' },
  { icon: 'target', title: 'Readable responses', copy: 'Simple, structured explanations' },
  { icon: 'wallet', title: 'Wallet overview', copy: 'See what your wallet holds' },
  { icon: 'speaker', title: 'Optional speech', copy: 'Hear updates read aloud' },
  { icon: 'check', title: 'Review first', copy: 'Stay in control of each action' },
];
const ways: { n: string; label: string; icon: IconName; title: string; copy: string; points: string[]; cta: string; href: string; tone: string }[] = [
  { n: '01', label: 'Typed requests', icon: 'chat', title: 'Ask naturally.', copy: 'Type what you want in your own words, such as “Send 0.1 SOL to Mum”.', points: ['Natural-language requests', 'Clear explanations', 'Confirmation before actions'], cta: 'Try a request', href: '#app', tone: 'warm' },
  { n: '02', label: 'Keyboard', icon: 'keyboard', title: 'Stay in control.', copy: 'Navigate and act with familiar keys. No mouse or microphone needed.', points: ['Every control reachable by Tab', 'Focus moves to each new step', 'Readable action summaries'], cta: 'Open Readback', href: '#app', tone: 'dark' },
  { n: '03', label: 'Assistive tech', icon: 'target', title: 'Designed to include.', copy: 'Built to work with NVDA, VoiceOver and TalkBack, using standard page structure.', points: ['Semantic navigation', 'Status messages your reader announces', 'Predictable interactions'], cta: 'Read the FAQ', href: '#faq', tone: 'light' },
];
const faqs: [string, string][] = [
  ['What exactly is Readback?', 'Readback is an accessibility-first way to use Solana. It explains your wallet and every payment in plain words, and reads each payment back from the real transaction before you approve it.'],
  ['Can I use Readback without relying on sight?', 'That is what it is built for. Every screen has headings and labelled controls, focus moves to each new step, and status updates are announced to your screen reader. It has passed automated keyboard and screen-reader checks; testing with blind users is still to come.'],
  ['Does Readback make decisions or move funds for me?', 'No. AI only helps understand your request. Payments go only to saved contacts you verified, within limits checked in code, and nothing is sent until you press Confirm yourself. Saying or typing “confirm” does nothing.'],
  ['Can I navigate with my keyboard or screen reader?', 'Yes. Use Tab and Shift+Tab to move, Enter or Space to activate, and Escape to cancel a review. Readback adds no global shortcuts, so your screen reader keys keep working.'],
  ['What network does the prototype use?', 'Solana Devnet only. Test SOL has no monetary value. The wallet lives in your browser with no backup, so never use real funds. This is a hackathon prototype and has not been audited.'],
];

export function Landing() {
  return <div className="landing">
    <a className="skip" href="#main">Skip to main content</a>
    <SiteNav />
    <div className="portrait-intro">
      <div className="portrait-backdrop" aria-hidden="true" />
      <div className="hero-lettering-frame" aria-hidden="true"><svg className="hero-backword" viewBox="610 245 1470 275"><image href="/assets/readback-wordmark.png" width="2172" height="724" /></svg></div>
      <div className="hero-person-frame" aria-hidden="true"><div className="hero-person"><img src="/assets/readback-portrait.png" alt="" width="1076" height="1448" fetchPriority="high" /></div></div>
      <div className="hero-bottom-fade" aria-hidden="true" />
      <main id="main" tabIndex={-1}>
        <section className="portrait-hero" aria-labelledby="hero-heading">
          <div className="portrait-copy"><p className="hero-eyebrow">SOLANA, FOR DIFFERENT WAYS OF INTERACTING</p><h1 id="hero-heading">A clearer way<br />into Solana.<br />On your terms.</h1><div className="portrait-actions"><a className="button hero-primary" href="#app">Try Readback <Icon name="arrow" size={18} /></a><a className="button outline-light" href="#how">See how it works <span aria-hidden="true">▷</span></a></div><p className="portrait-network">Devnet prototype · Test funds only</p></div>
          <p className="hero-statement">Understand<br />every step.<br />Make it yours.</p>
          <div className="hero-notes"><div className="hero-note-stack"><div className="hero-glass"><span><Icon name="chat" size={22} />Ask anything</span><p>Get clear answers about Solana in plain words.</p></div><div className="hero-glass"><span><Icon name="settings" size={22} />Your controls</span><p>Read, type, or listen your way.</p></div></div><div className="hero-review"><span><Icon name="person" size={24} />Built for you</span><p>Accessible, simple, and inclusive.</p></div></div>
        </section>
        <div id="hero-end" />

        <section id="product" className="lp-mission" aria-labelledby="mission-heading">
          <div className="lp-float f1" aria-hidden="true"><Icon name="speaker" size={34} /></div>
          <div className="lp-float f2" aria-hidden="true"><Icon name="target" size={30} /></div>
          <div className="lp-float f3" aria-hidden="true"><Icon name="spark" size={28} /></div>
          <h2 id="mission-heading">Solana, made clearer.<br /><span className="lp-accent">Access, made personal.</span></h2>
          <p className="lp-lead">Different ways to navigate. Plain-language explanations. Control that stays with you, every step of the way.</p>
          <a className="lp-btn lp-btn-solid" href="#app">Explore Readback <Icon name="arrow" size={16} /></a>
        </section>
        <div className="lp-band">
          <p>Built for the way you interact.</p>
          <ul>{([['keyboard', 'Keyboard'], ['chat', 'Typed requests'], ['target', 'Screen readers'], ['check', 'Your approval']] as [IconName, string][]).map(([icon, label]) => <li key={label}><Icon name={icon} size={22} />{label}</li>)}</ul>
        </div>

        <section id="features" className="lp-section" aria-labelledby="features-heading">
          <Pill icon="spark">What Readback does</Pill>
          <h2 id="features-heading">Explore our <span className="lp-accent">standout features.</span></h2>
          <div className="lp-feature-grid">
            <article className="lp-feature f-peach"><div><h3>Understand your wallet</h3><p>Your live Devnet balance and activity, explained in language that makes sense.</p></div><div className="lp-wallet-card" aria-hidden="true"><span>◆ YOUR WALLET · EXAMPLE</span><strong>12.48 SOL</strong><i /><i /><i /></div></article>
            <article className="lp-feature f-sand"><div><h3>Screen-reader first</h3><p>Every update is written for your screen reader. App speech is there if you want it, off by default.</p></div><div className="lp-wave-card" aria-hidden="true">{[30, 46, 62, 80, 96, 80, 62, 46, 30, 18].map((h, i) => <b key={i} style={{ height: h }} />)}</div></article>
            <article className="lp-feature f-cream"><div><h3>Clear transaction reviews</h3><p>Hear the contact, the full address, the amount, the fee and your balance after, before you confirm.</p></div><ul className="lp-review-stack" aria-hidden="true"><li><Icon name="check" size={14} />Transaction explained</li><li><Icon name="check" size={14} />Destination checked</li><li><Icon name="check" size={14} />You decide what happens</li></ul></article>
            <article className="lp-feature f-dark"><div><h3>Accessible by design</h3><p>Clear contrast, keyboard access and screen readers in mind from the first line of code.</p></div><div className="lp-diamond" aria-hidden="true" /></article>
          </div>
        </section>

        <section className="lp-section lp-details" aria-labelledby="details-heading">
          <Pill icon="spark">More ways to use it</Pill>
          <h2 id="details-heading">The details matter. <span className="lp-accent">All of them.</span></h2>
          <p className="lp-lead">An experience that adapts to your needs, not the other way around.</p>
          <ul className="lp-chips">{details.map(d => <li key={d.title}><span className="lp-chip-icon" aria-hidden="true"><Icon name={d.icon} size={22} /></span><span><strong>{d.title}</strong>{d.copy}</span></li>)}</ul>
          <div className="lp-phone-stage" aria-hidden="true">
            <p className="lp-ghost-word">ACCESS ON YOUR TERMS</p>
            <div className="lp-phone"><div className="lp-notch" /><p className="lp-phone-brand">◆ Readback</p><p className="lp-phone-title">Hi there.</p><p className="lp-phone-sub">What would you like to do today?</p><p className="lp-phone-bubble">“Explain my latest payment.”</p><p className="lp-phone-btn"><Icon name="chat" size={16} />Ask a question</p></div>
          </div>
        </section>

        <section className="lp-section" aria-labelledby="clarity-heading">
          <Pill icon="spark">Why it matters</Pill>
          <h2 id="clarity-heading">Clarity changes <span className="lp-accent">everything.</span></h2>
          <div className="lp-clarity">
            <div className="lp-gauge-stage" aria-hidden="true"><div className="lp-gauge-card"><p><span>Clarity check</span><span className="lp-orange-text">Review ↗</span></p><div className="lp-gauge" /><strong>Ready</strong><small>Your action, explained first</small></div></div>
            <div className="lp-clarity-copy">
              <h3>Less guesswork.<br /><span className="lp-accent">More confidence.</span></h3>
              <p>In a study of 10 popular crypto wallets, 8 had no accessibility features. Blind participants sent funds to the wrong address because nothing read it back. <a href={soups}>Read the SOUPS 2023 study (PDF)</a></p>
              <ul className="lp-checklist"><Check>Know what you are about to do</Check><Check>Understand information in plain language</Check><Check>Stay in control of your wallet</Check></ul>
            </div>
          </div>
        </section>

        <section className="lp-section" aria-labelledby="control-heading">
          <Pill icon="check">Our approach</Pill>
          <h2 id="control-heading">Built around <span className="lp-accent">your control.</span></h2>
          <p className="lp-lead">Every interaction starts with clarity and ends with your choice.</p>
          <div className="lp-pills-grid">
            <div className="lp-capsule c-ghost" aria-hidden="true"><Icon name="bolt" size={34} /></div>
            <div className="lp-capsule c-tint"><strong className="lp-big">03</strong><span>ways to interact: keyboard, typed requests and screen readers</span></div>
            <div className="lp-capsule c-ghost" aria-hidden="true"><Icon name="spark" size={40} /></div>
            <div className="lp-capsule c-tint c-wide"><strong className="lp-big">You decide.</strong><span>Understand each step before you approve an action. AI can’t move money.</span></div>
            <div className="lp-capsule c-solid"><strong className="lp-big">Clear.</strong><span>Payments read back before you sign.</span></div>
          </div>
        </section>

        <section id="how" className="lp-section lp-how" aria-labelledby="how-heading">
          <div className="lp-how-intro">
            <Pill icon="arrow">How it works</Pill>
            <h2 id="how-heading">From question<br /><span className="lp-accent">to clarity.</span></h2>
            <p className="lp-lead">Three simple steps to explore Solana in a way that works for you.</p>
            <a className="lp-btn lp-btn-solid" href="#app">Try Readback <Icon name="arrow" size={16} /></a>
          </div>
          <div className="lp-phone tilt" aria-hidden="true"><div className="lp-notch" /><p className="lp-phone-brand">◆ Readback</p><p className="lp-phone-title">What can I do?</p><p className="lp-phone-sub">Ask about balances, payments or Solana itself.</p><p className="lp-phone-btn"><Icon name="chat" size={16} />Ask a question</p><p className="lp-phone-row">My wallet balance →</p><p className="lp-phone-row">Explain my last payment →</p><p className="lp-phone-note">No action happens without your confirmation.</p></div>
          <ol className="lp-steps">
            <li><h3>Ask your question</h3><p>Type a request, or use your keyboard and preferred assistive technology.</p></li>
            <li><h3>Get an explanation</h3><p>Readback checks the contact, amount and limits, simulates the payment, and reads back exactly what will happen.</p></li>
            <li><h3>Choose what happens next</h3><p>Review the details and decide. Nothing is sent until you press Confirm.</p></li>
          </ol>
        </section>

        <section id="access" className="lp-section" aria-labelledby="ways-heading">
          <Pill icon="target">Designed for choice</Pill>
          <h2 id="ways-heading">Your way in. <span className="lp-accent">Your pace.</span></h2>
          <p className="lp-lead">One experience, with more than one way to navigate.</p>
          <div className="lp-ways">{ways.map(w => <article key={w.n} className={`lp-way w-${w.tone}`}>
            <div className="lp-way-top"><p>{w.n} — {w.label}</p><Icon name={w.icon} size={52} /></div>
            <div className="lp-way-body"><h3>{w.title}</h3><p>{w.copy}</p><ul className="lp-ticks">{w.points.map(p => <li key={p}><Icon name="check" size={14} />{p}</li>)}</ul><a className={`lp-btn ${w.tone === 'dark' ? 'lp-btn-solid' : 'lp-btn-ghost'}`} href={w.href}>{w.cta} <Icon name="arrow" size={16} /></a></div>
          </article>)}</div>
        </section>

        <section id="resources" className="lp-section" aria-labelledby="resources-heading">
          <Pill icon="book">Resources</Pill>
          <h2 id="resources-heading">Learn about <span className="lp-accent">Solana and accessibility.</span></h2>
          <div className="lp-resources">
            <a className="lp-resource-main" href="https://solana.com/docs"><span className="lp-orb-art" aria-hidden="true"><span /></span><span className="lp-tag">Getting started · Solana docs</span><span className="lp-resource-title">A beginner-friendly introduction to Solana<span className="sr-only"> (opens solana.com)</span></span></a>
            <ul>
              <li><a href={soups}><span className="lp-thumb t1" aria-hidden="true"><Icon name="bolt" size={30} /></span><span><span className="lp-tag">Research</span><span className="lp-resource-title">Why crypto wallets fail blind users (SOUPS 2023)<span className="sr-only"> (PDF)</span></span></span></a></li>
              <li><a href="https://webaim.org/techniques/keyboard/"><span className="lp-thumb t2" aria-hidden="true"><Icon name="keyboard" size={30} /></span><span><span className="lp-tag">Practical tips</span><span className="lp-resource-title">Getting more out of keyboard navigation<span className="sr-only"> (opens webaim.org)</span></span></span></a></li>
              <li><a href="#app"><span className="lp-thumb t3" aria-hidden="true"><Icon name="check" size={30} /></span><span><span className="lp-tag">Wallet basics</span><span className="lp-resource-title">What to check before approving a payment</span></span></a></li>
            </ul>
          </div>
        </section>

        <section id="faq" className="lp-section lp-faq" aria-labelledby="faq-heading">
          <Pill icon="chat">FAQ</Pill>
          <h2 id="faq-heading">Frequently asked <span className="lp-accent">questions.</span></h2>
          <div className="lp-faq-list">{faqs.map(([q, a], i) => <details key={q} open={i === 0}><summary>{q}<Icon name="chevron" size={20} /></summary><p>{a}</p></details>)}</div>
          <p className="lp-faq-more">Still have a question? <a href="#app">Explore Readback →</a></p>
        </section>

        <section className="lp-cta" aria-labelledby="cta-heading">
          <h2 id="cta-heading">Solana, on <em>your</em> terms.</h2>
          <p>Explore your wallet with clearer information and accessible controls. The next step is yours.</p>
          <a className="lp-btn lp-btn-light" href="#app">Open Readback <Icon name="arrow" size={16} /></a>
          <div className="lp-cta-card left" aria-hidden="true"><small>Your wallet · example</small><strong>12.48 SOL</strong><small>Balance at a glance</small></div>
          <div className="lp-cta-card right" aria-hidden="true"><small>Action preview</small><strong>Review first</strong><small>Nothing moves without you</small></div>
        </section>
      </main>
    </div>
    <footer className="lp-footer">
      <div className="lp-footer-brand"><p className="lp-footer-logo"><span aria-hidden="true">◆</span> Readback</p><p>A clearer way into Solana.</p><p className="lp-footer-note">Built in 48 hours for the MLH Solana Hackathon. Prototype. Devnet only. Not audited.</p></div>
      <nav aria-label="Footer" className="lp-footer-cols">
        <div><p className="lp-footer-head">Product</p><a href="#product">Overview</a><a href="#features">Features</a><a href="#how">How it works</a></div>
        <div><p className="lp-footer-head">Explore</p><a href="#access">Accessibility</a><a href="#resources">Resources</a><a href="#faq">FAQ</a></div>
        <div><p className="lp-footer-head">Connect</p><a href={github}>GitHub</a><a href={`${github}/issues`}>Report an issue</a><a href="#app">Open the app</a></div>
        <div><p className="lp-footer-head">Legal</p><a href={`${github}/blob/main/LICENSE`}>MIT License</a><span>© 2026 Readback</span></div>
      </nav>
    </footer>
  </div>;
}
