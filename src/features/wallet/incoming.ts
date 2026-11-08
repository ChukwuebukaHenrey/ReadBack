import { address, createSolanaRpcSubscriptions, signature } from '@solana/kit';
import { verifiedDevnetRpc } from '../../lib/devnet';
import { listContacts } from '../contacts/service';
import { formatSol } from './amount';

type ParsedTx = { transaction: { message: { accountKeys: readonly { pubkey: string }[] } }; meta: { preBalances: readonly bigint[]; postBalances: readonly bigint[]; err: unknown } | null };

/**
 * Who paid the wallet, and how much, from balance changes only.
 * Memos, logs and token names are never read (G18).
 */
export function incomingFromTransaction(tx: ParsedTx, wallet: string): { from: string; lamports: bigint } | null {
  if (!tx.meta || tx.meta.err) return null;
  const keys = tx.transaction.message.accountKeys.map(k => String(k.pubkey));
  const index = keys.indexOf(wallet);
  if (index < 0) return null;
  const gained = BigInt(tx.meta.postBalances[index]) - BigInt(tx.meta.preBalances[index]);
  if (gained <= 0n) return null;
  let from = ''; let biggest = 0n;
  keys.forEach((key, i) => {
    if (i === index) return;
    const lost = BigInt(tx.meta!.preBalances[i]) - BigInt(tx.meta!.postBalances[i]);
    if (lost > biggest) { biggest = lost; from = key; }
  });
  return from ? { from, lamports: gained } : null;
}

/** Below this, an unexpected payment from a stranger is treated as likely address poisoning. */
export const DUST_LAMPORTS = 1_000_000n;
export function incomingAnnouncement(lamports: bigint, from?: string, contactName?: string) {
  if (!contactName && lamports < DUST_LAMPORTS) return `You received a very small payment of ${formatSol(lamports)} SOL from an unknown address. Tiny unexpected payments are often scams that plant a lookalike address in your history. Never copy an address from it.`;
  const sender = contactName ?? (from ? `an unknown address ending ${from.slice(-4)}` : 'an address Readback could not identify');
  return `You received ${formatSol(lamports)} SOL on Devnet from ${sender}.`;
}

/** Names the sender only if a recent transaction accounts for exactly this balance change. */
async function describeLatest(wallet: string, gained: bigint): Promise<string> {
  const client = await verifiedDevnetRpc();
  const abortSignal = AbortSignal.timeout(15000);
  const sigs = await client.getSignaturesForAddress(address(wallet), { commitment: 'confirmed', limit: 5 }).send({ abortSignal });
  for (const s of sigs) {
    const tx = await client.getTransaction(signature(s.signature), { commitment: 'confirmed', encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }).send({ abortSignal });
    const found = tx && incomingFromTransaction(tx as unknown as ParsedTx, wallet);
    if (found && found.lamports === gained) {
      const contact = (await listContacts().catch(() => [])).find(c => c.address === found.from);
      return incomingAnnouncement(found.lamports, found.from, contact?.name);
    }
  }
  return incomingAnnouncement(gained);
}

async function watchOnce(wallet: string, onReceive: (text: string) => void, abortSignal: AbortSignal, last: { lamports: bigint | null }) {
  const client = await verifiedDevnetRpc();
  const current = (await client.getBalance(address(wallet), { commitment: 'confirmed' }).send({ abortSignal })).value;
  // A payment that arrived while disconnected is still announced on reconnect.
  if (last.lamports !== null && current > last.lamports) onReceive(await describeLatest(wallet, current - last.lamports).catch(() => incomingAnnouncement(current - last.lamports!)));
  last.lamports = current;
  const subscriptions = createSolanaRpcSubscriptions('wss://api.devnet.solana.com');
  const notifications = await subscriptions.accountNotifications(address(wallet), { commitment: 'confirmed', encoding: 'base64' }).subscribe({ abortSignal });
  for await (const notification of notifications) {
    const lamports = notification.value.lamports;
    if (lamports > last.lamports!) {
      const gained = lamports - last.lamports!;
      onReceive(await describeLatest(wallet, gained).catch(() => incomingAnnouncement(gained)));
    }
    last.lamports = lamports;
  }
}

/** Subscribes directly to the public Devnet WebSocket; announces balance increases only. Reconnects with backoff. */
export async function watchIncoming(wallet: string, onReceive: (text: string) => void, abortSignal: AbortSignal) {
  const last = { lamports: null as bigint | null };
  for (let attempt = 0; !abortSignal.aborted; attempt++) {
    try { await watchOnce(wallet, onReceive, abortSignal, last); attempt = 0; }
    catch { /* Dropped or unreachable: retry below. */ }
    if (abortSignal.aborted) return;
    await new Promise(resolve => setTimeout(resolve, Math.min(60_000, 2_000 * 2 ** Math.min(attempt, 5))));
  }
}
