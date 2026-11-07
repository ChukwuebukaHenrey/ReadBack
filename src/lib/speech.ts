// Optional app speech. Off by default so it never talks over a screen reader.
export type SpeechSettings = { enabled: boolean; rate: number };
const KEY = 'readback-speech';
export const defaultSpeech: SpeechSettings = { enabled: false, rate: 1 };

export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}
export function loadSpeech(): SpeechSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw && typeof raw.enabled === 'boolean' && typeof raw.rate === 'number' && raw.rate >= 0.5 && raw.rate <= 2) return { enabled: raw.enabled, rate: raw.rate };
  } catch { /* Fall back to defaults. */ }
  return defaultSpeech;
}
export function saveSpeech(settings: SpeechSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* Preference only lasts this session. */ }
}
export function speak(text: string, settings: SpeechSettings) {
  if (!settings.enabled || !text.trim() || !speechSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = settings.rate;
  window.speechSynthesis.speak(utterance);
}
export function stopSpeech() { if (speechSupported()) window.speechSynthesis.cancel(); }
