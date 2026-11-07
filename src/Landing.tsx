import { Brand } from './components/Brand';
import { Icon } from './components/Icon';
import type { IconName } from './components/Icon';
import './landing.css';

const features: { title: string; label: string; copy: string; icon: IconName; art: string }[] = [
  { title: 'Your way to navigate', label: 'Your controls', copy: 'Use your keyboard, screen reader or a typed request. Speaking is never required.', icon: 'keyboard', art: 'portrait' },
  { title: 'Clarity at every step', label: 'Accessibility', copy: 'Clear labels, visible focus and written updates help you stay oriented.', icon: 'activity', art: 'waves' },
  { title: 'Understand your wallet', label: 'Understand', copy: 'Check your live Devnet balance and learn what network fees mean.', icon: 'learn', art: 'mark' },
  { title: 'You stay in control', label: 'Your choice', copy: 'Save independently verified contacts. AI can navigate, but cannot approve.', icon: 'shield', art: 'shield' },
];

function WaveArt() {
  return <svg viewBox="0 0 400 220" fill="none" aria-hidden="true">{Array.from({ length: 20 }, (_, i) => <path key={i} d={`M-20 ${160 + i * 4} C100 ${-80 + i * 8}, 240 ${300 - i * 3}, 430 ${30 + i * 6}`} stroke="currentColor" strokeWidth="1.3" />)}</svg>;
}

export function Landing() {
  return <div className="landing">
    <a className="skip" href="#main">Skip to main content</a>
    <div className="portrait-intro">
      <div className="portrait-backdrop" aria-hidden="true" />
      <header className="portrait-header">
        <a className="portrait-wordmark" href="#" aria-label="Readback home">Readback</a>
        <nav aria-label="Website navigation"><a href="#product">Product</a><a href="#accessibility">Accessibility</a><a href="#principles">Our approach</a><a href="https://github.com/ChukwuebukaHenrey/ReadBack">Resources</a></nav>
        <a className="button outline-light" href="#app">Open Readback <Icon name="arrow" size={17} /></a>
      </header>
      <div className="hero-backword" aria-hidden="true">Readback</div>
      <div className="hero-person-frame" aria-hidden="true"><div className="hero-person"><img src="/assets/readback-portrait.png" alt="" width="1076" height="1448" fetchPriority="high" /></div></div>
      <main id="main" tabIndex={-1}>
        <section className="portrait-hero" aria-labelledby="hero-heading">
          <div className="portrait-copy"><p className="hero-eyebrow">SOLANA, FOR DIFFERENT WAYS OF INTERACTING</p><h1 id="hero-heading">A clearer way<br />into Solana.<br />On your terms.</h1><p className="portrait-description">Explore your wallet with clear words, familiar controls and screen-reader-friendly navigation.</p><div className="portrait-actions"><a className="button hero-primary" href="#app">Try Readback <Icon name="arrow" size={18} /></a><a className="button outline-light" href="#product">See how it works <span aria-hidden="true">▷</span></a></div><p className="portrait-network">Devnet prototype · Test funds only</p></div>
          <p className="hero-statement">Understand<br />every step.<br />Make it yours.</p>
          <div className="hero-notes"><div className="hero-note-stack"><div className="hero-glass"><span><Icon name="keyboard" size={23} />Typed requests</span><p>“What can I do?”<br />Start with a question.</p></div><div className="hero-glass"><span><Icon name="activity" size={23} />Your controls</span><p className="note-large">Your pace.</p><p>Keyboard, text and<br />screen reader.</p></div></div><div className="hero-review"><span><Icon name="shield" size={27} />Your choice</span><p>AI interprets.<br />You decide.</p><span className="review-check" aria-hidden="true">✓</span></div></div>
        </section>
        <section id="product" className="mission-section" aria-labelledby="mission-heading">
          <div className="section-overline"><span>OUR MISSION</span><span>ACCESSIBLE ON SOLANA</span></div>
          <h2 id="mission-heading">Readback makes<br />Solana understandable.<br /><span>For everyone.</span></h2>
          <img className="mission-mark" src="/assets/readback-mark.png" alt="" width="240" height="240" loading="lazy" />
          <p className="mission-description">A more inclusive way to explore Solana — with keyboard controls, screen-reader support and clear feedback at every step. More understanding. More independence.</p>
          <div className="editorial-features">{features.map(feature => <article className="editorial-card" key={feature.art}><div className={`card-art art-${feature.art}`} aria-hidden="true"><span className="art-label"><Icon name={feature.icon} size={17} />{feature.label}</span>{feature.art === 'portrait' && <img src="/assets/readback-portrait.png" alt="" loading="lazy" />}{feature.art === 'waves' && <WaveArt />}{feature.art === 'mark' && <img src="/assets/readback-mark.png" alt="" loading="lazy" />}{feature.art === 'shield' && <div className="shield-disc"><Icon name="shield" size={72} /></div>}</div><div className="card-copy"><h3>{feature.title}</h3><p>{feature.copy}</p></div></article>)}</div>
        </section>
        <section id="principles" className="principles-section" aria-labelledby="principles-heading"><div className="section-overline"><span>WHY READBACK</span><span>BUILT FOR INCLUSION</span></div><h2 id="principles-heading">Less guesswork.<br />More <span>understanding.</span></h2><p className="principles-intro">Know where you are, what you can do, and what comes next.</p><div className="principle-rows"><article><Icon name="keyboard" size={32} /><div><h3>YOUR WAY FIRST</h3><p>Navigate without a mouse or microphone. Ask for help whenever you need it.</p></div></article><article><Icon name="contacts" size={32} /><div><h3>SAVED CONTACTS</h3><p>Review a full address and verify who it belongs to before saving it.</p></div></article><article><Icon name="wallet" size={32} /><div><h3>SOLANA, MADE CLEAR</h3><p>Explore a real Devnet wallet with test funds and plain-language explanations.</p></div></article></div></section>
        <section className="closing-portrait" aria-labelledby="closing-heading"><div className="closing-photo" aria-hidden="true" /><div><h2 id="closing-heading">A more inclusive<br />Solana experience.</h2><a className="button outline-light" href="#app">Find your next step <Icon name="arrow" size={18} /></a></div></section>
        <section id="accessibility" className="accessibility-section" aria-labelledby="accessibility-heading"><div><p className="hero-eyebrow">DESIGNED FOR DIFFERENT WAYS OF INTERACTING</p><h2 id="accessibility-heading">Clarity is part<br />of the experience.</h2></div><div className="accessibility-details"><details><summary>Keyboard and screen reader controls</summary><p>Use Tab to move between controls and Enter or Space to activate buttons. Use the skip link to reach the main content. Page headings receive focus when you move between workspace views, and status updates are available to your screen reader.</p></details><details><summary>Text, sound and motion</summary><p>Every essential message is text. No microphone is needed. App speech is off so it won’t compete with your screen reader. The interface respects reduced-motion preferences and supports zoom.</p></details><details><summary>What works in this prototype?</summary><p>Create a disposable Devnet wallet, check its live balance, save verified contacts and explore Web3 explanations. Payments and voice input are still being built. Test funds only; browser wallets have no recovery. Manual assistive-technology and disabled-user testing are still pending. We do not claim WCAG conformance.</p></details></div></section>
      </main>
    </div>
    <footer className="portrait-footer"><a className="brand" href="#" aria-label="Readback home"><Brand /></a><p>AI interprets. You stay in control.</p><a href="https://github.com/ChukwuebukaHenrey/ReadBack">View the project <span aria-hidden="true">↗</span></a></footer>
  </div>;
}
