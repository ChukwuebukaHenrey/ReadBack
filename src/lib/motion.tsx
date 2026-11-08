import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useInView, useReducedMotion, useScroll, useTransform, type Variants } from 'motion/react';

/** Shared motion language: short, ease-out, no overshoot (this app handles money). */
export const ease = [0.22, 1, 0.36, 1] as const;
export const durations = { ui: 0.2, surface: 0.45 } as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  shown: { opacity: 1, y: 0, transition: { duration: durations.surface, ease } },
};
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: durations.surface, ease } },
};
export const slideFrom = (x: number): Variants => ({
  hidden: { opacity: 0, x },
  shown: { opacity: 1, x: 0, transition: { duration: durations.surface, ease } },
});
export const stagger = (gap = 0.07): Variants => ({ hidden: {}, shown: { transition: { staggerChildren: gap } } });
export const inView = { initial: 'hidden', whileInView: 'shown', viewport: { once: true, amount: 0.2 } } as const;

/** Fades and lifts its content into view once. */
export function Reveal({ children, className, delay = 0, as = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'li' | 'section' }) {
  const Tag = motion[as];
  return <Tag className={className} {...inView} variants={fadeUp} transition={{ delay }}>{children}</Tag>;
}

/** Scroll-linked vertical drift for decorative elements. Disabled under reduced motion. */
export function useParallax(distance = 40) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [distance, -distance]);
  return { ref, y };
}

/**
 * Counts up to `value` the first time it scrolls into view.
 * Screen readers get the final figure immediately; only the visible digits animate.
 */
export function Counter({ value, decimals = 0, pad = 0, prefix = '', suffix = '', className, exact }: { value: number; decimals?: number; pad?: number; prefix?: string; suffix?: string; className?: string; exact?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const format = (n: number) => `${prefix}${n.toFixed(decimals).padStart(pad, '0')}${suffix}`;
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!seen || reduce) return;
    const controls = animate(0, value, { duration: 1.1, ease, onUpdate: setCurrent });
    return () => controls.stop();
  }, [seen, reduce, value]);
  const done = reduce || current >= value;
  const finalText = exact ?? format(value);
  const visible = done ? finalText : format(current);
  return <span ref={ref} className={className}><span aria-hidden="true">{visible}</span><span className="sr-only">{finalText}</span></span>;
}
