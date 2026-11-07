export type IconName = 'home' | 'wallet' | 'send' | 'activity' | 'learn' | 'contacts' | 'arrow' | 'keyboard' | 'shield' | 'settings';
const paths: Record<IconName, string> = {
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  wallet: 'M20 8V5H5a2 2 0 0 0 0 4h16v12H5a2 2 0 0 1-2-2V7m18 6h-6v4h6m-3-2h.01',
  send: 'M7 17 20 4M7 4h13v13M4 12v8h8',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  learn: 'm2 9 10-5 10 5-10 5L2 9m4 2v6l6 3 6-3v-6m4-2v8',
  contacts: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M13 3a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  keyboard: 'M3 6h18v13H3V6m4 4h.01M11 10h.01M15 10h.01M7 14h.01M11 14h.01M15 14h.01M7 17h10',
  settings: 'M4 6h10m4 0h2M4 12h4m4 0h8M4 18h12m4 0h0M14 4v4m-6 2v4m8 2v4',
  shield: 'm12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4m-4 9 3 3 5-6',
};
export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
