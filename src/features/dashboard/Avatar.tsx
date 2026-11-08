/** Decorative initial avatar, coloured deterministically from a public address. */
const tones = ['#ffd2b8', '#ffc29c', '#f9d7c6', '#ffe0cc', '#f5c6a8', '#ffd8bf'];
export function Avatar({ seed, name, size = 40 }: { seed: string; name?: string; size?: number }) {
  const tone = tones[[...seed].reduce((s, c) => s + c.charCodeAt(0), 0) % tones.length];
  return <span className="rb-avatar" aria-hidden="true" style={{ width: size, height: size, background: tone }}>{(name ?? seed).trim().charAt(0).toUpperCase()}</span>;
}
