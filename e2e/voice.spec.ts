import { test, expect, type Page } from '@playwright/test';

// A scripted speech engine standing in for the browser's: it "hears" window.__say.
async function fakeSpeech(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __say: string; __starts: number; SpeechRecognition: unknown; webkitSpeechRecognition: unknown };
    w.__say = ''; w.__starts = 0;
    class FakeRecognition {
      lang = 'en-US'; interimResults = true; continuous = false; maxAlternatives = 1;
      onresult: ((e: unknown) => void) | null = null; onerror: ((e: unknown) => void) | null = null; onend: (() => void) | null = null;
      start() {
        w.__starts++;
        setTimeout(() => {
          const result = Object.assign([{ transcript: w.__say }], { isFinal: true });
          this.onresult?.({ results: [result] });
          this.onend?.();
        }, 300);
      }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    }
    w.SpeechRecognition = FakeRecognition; w.webkitSpeechRecognition = FakeRecognition;
    localStorage.setItem('readback-session', 'demo');
  });
}
const say = (page: Page, text: string) => page.evaluate(t => { (window as unknown as { __say: string }).__say = t; }, text);

test('push-to-talk fills a payment through the safe pipeline; spoken "confirm" approves nothing; mic stays off during review', async ({ page }) => {
  test.setTimeout(90_000);
  const relay: string[] = [];
  await page.route('**/api/devnet', route => { relay.push('call'); return route.abort(); });
  await fakeSpeech(page);
  await page.goto('/#app');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });

  const speak = page.locator('.rb-top').getByRole('button', { name: 'Speak' });
  await say(page, 'send 0.2 SOL to Mum');
  await speak.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: /Listening|Heard: send 0.2 SOL to Mum|Nothing has been approved/ })).toBeVisible();
  await expect(page.getByLabel('Amount in SOL', { exact: true })).toHaveValue('0.2', { timeout: 10_000 });
  await expect(page.getByRole('radio', { name: /^Mum / })).toBeChecked();

  await say(page, 'confirm');
  await page.locator('.rb-top').getByRole('button', { name: 'Speak' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'I cannot authorize payments' })).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: 'Review payment', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const startsBefore = await page.evaluate(() => (window as unknown as { __starts: number }).__starts);
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('.rb-top .rb-mic')?.click());
  expect(await page.evaluate(() => (window as unknown as { __starts: number }).__starts)).toBe(startsBefore);
  await expect(page.getByRole('heading', { name: 'Review Devnet test payment' })).toBeVisible();
  expect(relay).toEqual([]);
});
