import { useEffect, useRef, useState } from 'react';
import { Brand } from './components/Brand';
import { Icon } from './components/Icon';
import { AnimatePresence, motion } from 'motion/react';
import { durations, ease } from './lib/motion';

const links = [
  { href: '#features', label: 'Product' },
  { href: '#how', label: 'How it works' },
  { href: '#access', label: 'Accessibility' },
  { href: '#resources', label: 'Resources' },
  { href: '#faq', label: 'FAQ' },
];

/** Floating pill navbar: dark glass over the hero, light glass over content. Menu sheet on small screens. */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [onLight, setOnLight] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const hero = document.getElementById('hero-end');
    if (!hero || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setOnLight(entry.boundingClientRect.top < 80), { rootMargin: '-80px 0px 0px 0px', threshold: [0, 1] });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); } };
    const onWide = () => { if (window.innerWidth > 900) setOpen(false); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onWide);
    return () => { document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onWide); };
  }, [open]);

  return <header className={`site-nav${onLight ? ' on-light' : ''}${open ? ' is-open' : ''}`}>
    <div className="site-nav-bar">
      <a className="site-nav-brand" href="#" aria-label="Readback home"><Brand tone={onLight ? 'dark' : 'light'} /></a>
      <nav aria-label="Website" className="site-nav-links">{links.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav>
      <div className="site-nav-actions">
        <a className="nav-cta" href="#login">Open Readback <Icon name="arrow" size={16} /></a>
        <button ref={toggle} type="button" className="nav-toggle" aria-expanded={open} aria-controls={open ? 'site-menu' : undefined} onClick={() => setOpen(value => !value)}>
          <Icon name={open ? 'close' : 'menu'} size={20} /><span>{open ? 'Close' : 'Menu'}</span>
        </button>
      </div>
    </div>
    <AnimatePresence>{open && <motion.nav key="menu" id="site-menu" aria-label="Website menu" className="site-menu" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: durations.ui, ease }}>
      {links.map((link, i) => <a key={link.href} ref={i === 0 ? firstLink : undefined} href={link.href} onClick={() => setOpen(false)}>{link.label}<Icon name="arrow" size={18} /></a>)}
      <a className="site-menu-cta" href="#login" onClick={() => setOpen(false)}>Open Readback <Icon name="arrow" size={18} /></a>
    </motion.nav>}</AnimatePresence>
  </header>;
}
