/**
 * The one Readback logo. Same artwork everywhere; `tone` only picks the contrast-safe lettering:
 * "light" lettering for dark backgrounds, "dark" lettering for light backgrounds.
 */
export function Brand({ tone = 'light', width }: { tone?: 'light' | 'dark'; width?: number }) {
  const src = tone === 'dark' ? '/assets/readback-wordmark-dark.png' : '/assets/readback-wordmark.png';
  return <span className="brand-lockup" role="img" aria-label="Readback" style={width ? { width } : undefined}>
    <svg viewBox="115 185 1970 365" width="216" height="40" aria-hidden="true"><image href={src} width="2172" height="724" /></svg>
    <span className="brand-fallback" aria-hidden="true">Readback</span>
  </span>;
}
