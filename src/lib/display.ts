import { useState } from 'react';

/** Per-browser display preferences. Layered on top of system settings (contrast, motion), never replacing them. */
export type DisplayPrefs = { largeText: boolean; contrast: boolean };
const KEY = 'readback-display';
const defaults: DisplayPrefs = { largeText: false, contrast: false };

function load(): DisplayPrefs {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null'); if (v && typeof v.largeText === 'boolean' && typeof v.contrast === 'boolean') return v; } catch { /* Defaults. */ }
  return defaults;
}
export function useDisplayPrefs(): [DisplayPrefs, (next: DisplayPrefs) => void] {
  const [prefs, setPrefs] = useState<DisplayPrefs>(load);
  const update = (next: DisplayPrefs) => { setPrefs(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* This session only. */ } };
  return [prefs, update];
}
