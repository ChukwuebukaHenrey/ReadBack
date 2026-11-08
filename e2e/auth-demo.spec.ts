import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('demo: one click, persists across refresh, payments never reach the network, exit clears it', async ({ page }) => {
  test.setTimeout(90_000);
  const relayCalls: string[] = [];
  await page.route('**/api/devnet', route => { relayCalls.push(route.request().postDataJSON()?.method); return route.abort(); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#login');
  await expect(page.getByRole('heading', { name: 'Welcome back', level: 1 })).toBeFocused();
  const demo = page.getByRole('button', { name: /Try the demo/ });
  await demo.focus(); await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: 'Welcome back, Amara', level: 1 })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Demo account.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome back, Amara', level: 1 })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Total balance' })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);

  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Send SOL', exact: true }).click();
  await page.getByRole('radio', { name: /^Mum / }).check();
  await page.getByLabel('Amount in SOL', { exact: true }).fill('0.1');
  await page.getByRole('button', { name: 'Review payment', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleDescription(/^Demo payment\. Nothing is sent to Solana\./);
  await page.getByRole('button', { name: 'Confirm test payment' }).click();
  await expect(page.getByRole('heading', { name: 'Demo payment recorded' })).toBeFocused();
  await expect(page.getByRole('link', { name: /Solana Explorer/ })).toHaveCount(0);
  expect(relayCalls).toEqual([]);

  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Exit demo' }).click();
  await expect(page).toHaveURL(/#login$/);
  expect(await page.evaluate(() => localStorage.getItem('readback-session'))).toBeNull();
});

test('auth pages are honest about the browser wallet and pass axe', async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#login');
    await expect(page.getByText('There’s no Readback wallet in this browser yet.')).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'Create a wallet' }).first().click();
    await expect(page.getByRole('heading', { name: 'Create your wallet', level: 1 })).toBeFocused();
    await expect(page.getByRole('button', { name: /Create wallet/ })).toBeDisabled();
    await page.getByLabel(/I understand this is a Devnet test wallet/).check();
    await expect(page.getByRole('button', { name: /Create wallet/ })).toBeEnabled();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  }
});

test('the navbar keeps the same Readback logo before and after scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const logo = page.locator('.site-nav-brand image');
  const before = await logo.getAttribute('href');
  await page.evaluate(() => window.scrollTo(0, 1600));
  await expect(page.locator('.site-nav')).toHaveClass(/on-light/);
  const after = await logo.getAttribute('href');
  expect(await page.locator('.site-nav-brand .brand-lockup').count()).toBe(1);
  expect([before, after].sort()).toEqual(['/assets/readback-wordmark-dark.png', '/assets/readback-wordmark.png']);
  await expect(page.locator('.site-nav-brand')).toHaveAccessibleName('Readback home');
});
