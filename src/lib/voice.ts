import { useCallback, useEffect, useRef, useState } from 'react';
import { stopSpeech } from './speech';

/** Minimal Web Speech API types (not in the TS DOM lib). */
type Alternative = { transcript: string };
type ResultEvent = { results: ArrayLike<ArrayLike<Alternative> & { isFinal: boolean }> };
type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: ResultEvent) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;
const Ctor = (): RecognitionCtor | undefined => typeof window === 'undefined' ? undefined : (window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition;

export const voiceSupported = () => Boolean(Ctor());
const reviewOpen = () => Boolean(document.querySelector('dialog[open]'));

const errors: Record<string, string> = {
  'not-allowed': 'Microphone access was blocked. Allow it in your browser, or type your request.',
  'service-not-allowed': 'Voice input is turned off in this browser. Type your request instead.',
  'no-speech': 'I didn’t hear anything. Press Speak and try again, or type your request.',
  'audio-capture': 'No microphone was found. Type your request instead.',
  network: 'Voice input needs a connection to your browser’s speech service. Type your request instead.',
};

/**
 * Push-to-talk: one press listens for one request, then stops by itself.
 * Never runs while a payment review is open (G17), and pauses app speech so it can't hear itself.
 */
export function useVoiceInput({ onFinal, announce }: { onFinal: (text: string) => void; announce: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const rec = useRef<Recognition | null>(null);
  const finalText = useRef('');
  const latest = useRef(onFinal);
  useEffect(() => { latest.current = onFinal; }, [onFinal]);

  const stop = useCallback(() => { rec.current?.stop(); }, []);

  const start = useCallback(() => {
    const Recognition = Ctor();
    if (!Recognition) { announce('Voice input isn’t supported in this browser. Type your request instead.'); return; }
    if (reviewOpen()) { announce('The microphone stays off while a payment review is open.'); return; }
    if (rec.current) return;
    stopSpeech();
    const r = new Recognition();
    r.lang = navigator.language || 'en-US'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    finalText.current = '';
    r.onresult = e => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      const last = e.results[e.results.length - 1];
      if (last?.isFinal) finalText.current = text.trim(); else setInterim(text);
    };
    r.onerror = e => { if (e.error !== 'aborted') announce(errors[e.error] ?? 'Voice input stopped. Type your request instead.'); };
    r.onend = () => {
      rec.current = null; setListening(false); setInterim('');
      const text = finalText.current;
      if (text && !reviewOpen()) { announce(`Heard: ${text}`); latest.current(text); }
      else if (!text) announce('Stopped listening.');
    };
    rec.current = r;
    try { r.start(); setListening(true); announce('Listening. Say your request.'); }
    catch { rec.current = null; announce('Voice input couldn’t start. Type your request instead.'); }
  }, [announce]);

  // G17: if a review dialog opens while listening, stop immediately.
  useEffect(() => {
    if (!listening) return;
    const observer = new MutationObserver(() => { if (reviewOpen()) rec.current?.abort(); });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'], childList: true });
    return () => observer.disconnect();
  }, [listening]);
  useEffect(() => () => rec.current?.abort(), []);

  return { supported: voiceSupported(), listening, interim, start, stop, toggle: () => (rec.current ? stop() : start()) };
}
