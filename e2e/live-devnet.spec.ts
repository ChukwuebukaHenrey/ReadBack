import { test, expect, chromium } from '@playwright/test';
import { address, createSolanaRpc, generateKeyPairSigner, lamports } from '@solana/kit';

// Opt-in live run against real Solana Devnet. No RPC mocks: the app talks to its own relay.
// Run with: LIVE_DEVNET=1 npx playwright test e2e/live-devnet.spec.ts
// The wallet lives in a persistent profile (.live-devnet-profile) so it can be funded once at
// https://faucet.solana.com and reused. Public RPC airdrops are attempted but are usually disabled.
test.skip(!process.env.LIVE_DEVNET, 'Set LIVE_DEVNET=1 to send a real Devnet test payment.');

test('real Devnet transfer through the keyboard review flow', async ({ baseURL }) => {
  test.setTimeout(15 * 60_000);
  const context = await chromium.launchPersistentContext('.live-devnet-profile', { channel: 'msedge', headless: true, baseURL });
  const page = context.pages()[0] ?? await context.newPage();
  const devnet = createSolanaRpc('https://api.devnet.solana.com');
  const recipient = (await generateKeyPairSigner()).address;
  const contactName = `Mum ${Date.now() % 100000}`; // unique per run: the profile persists

  await page.goto('/#app');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Wallet', exact: true }).click();
  const create = page.getByRole('button', { name: 'Create disposable Devnet wallet' });
  const addressText = page.locator('.wallet-panel .wallet-address');
  await expect(create.or(addressText)).toBeVisible();
  if (await create.isVisible()) {
    await page.getByLabel('I understand this is a disposable test wallet with no recovery.').check();
    await create.click();
  }
  const walletAddress = (await addressText.innerText()).trim();

  const needed = 200_000_000n;
  const funded = async () => (await devnet.getBalance(address(walletAddress), { commitment: 'confirmed' }).send()).value >= needed;
  if (!await funded()) {
    try { await devnet.requestAirdrop(address(walletAddress), lamports(1_000_000_000n), { commitment: 'confirmed' }).send(); }
    catch { console.log(`FUND THIS DEVNET WALLET (at least 0.2 test SOL) at https://faucet.solana.com : ${walletAddress}`); }
    for (let i = 0; i < 120 && !await funded(); i++) await page.waitForTimeout(5000);
    expect(await funded()).toBe(true);
  }

  await page.getByRole('button', { name: 'Saved contacts', exact: true }).click();
  await page.getByLabel('Contact name', { exact: true }).fill(contactName);
  await page.getByLabel('Paste the recipient’s full Solana address').fill(recipient);
  await page.getByRole('button', { name: 'Review contact address' }).click();
  await page.getByLabel('Type the last four characters of the address').fill(recipient.slice(-4));
  await page.getByLabel('I checked the full address').check();
  await page.getByRole('button', { name: 'Save verified contact' }).click();

  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Send SOL', exact: true }).click();
  await page.getByLabel('Saved contact', { exact: true }).selectOption({ label: contactName });
  await page.getByLabel('Amount in SOL', { exact: true }).fill('0.1');
  await page.getByRole('button', { name: 'Review payment', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Review Devnet test payment' })).toBeFocused({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Confirm test payment' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Payment confirmed', exact: true })).toBeVisible({ timeout: 60_000 });

  const sig = (await page.getByRole('dialog').locator('.wallet-address').innerText()).trim();
  const balance = await devnet.getBalance(recipient, { commitment: 'confirmed' }).send();
  expect(balance.value).toBe(100_000_000n);
  console.log(JSON.stringify({ network: 'devnet', sender: walletAddress, recipient, signature: sig, recipientLamports: balance.value.toString() }));
  await context.close();
});
