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

export function incomingAnnouncement(lamports: bigint, from: string, contactName?: string) {
  return `You received ${formatSol(lamports)} SOL on Devnet from ${contactName ?? `an unknown address ending ${from.slice(-4)}`}.`;
}

async function describeLatest(wallet: string): Promise<string | null> {
  const client = await verifiedDevnetRpc();
  const abortSignal = AbortSignal.timeout(15000);
  const sigs = await client.getSignaturesForAddress(address(wallet), { commitment: 'confirmed', limit: 5 }).send({ abortSignal });
  for (const s of sigs) {
    const tx = await client.getTransaction(signature(s.signature), { commitment: 'confirmed', encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }).send({ abortSignal });
    const found = tx && incomingFromTransaction(tx as unknown as ParsedTx, wallet);
    if (found) {
      const contact = (await listContacts().catch(() => [])).find(c => c.address === found.from);
      return incomingAnnouncement(found.lamports, found.from, contact?.name);
    }
  }
  return null;
}

/** Subscribes directly to the public Devnet WebSocket; announces balance increases only. */
export async function watchIncoming(wallet: string, onReceive: (text: string) => void, abortSignal: AbortSignal) {
  const client = await verifiedDevnetRpc();
  let last = (await client.getBalance(address(wallet), { commitment: 'confirmed' }).send({ abortSignal })).value;
  const subscriptions = createSolanaRpcSubscriptions('wss://api.devnet.solana.com');
  const notifications = await subscriptions.accountNotifications(address(wallet), { commitment: 'confirmed', encoding: 'base64' }).subscribe({ abortSignal });
  for await (const notification of notifications) {
    const lamports = notification.value.lamports;
    if (lamports > last) {
      const gained = lamports - last;
      let text: string | null = null;
      try { text = await describeLatest(wallet); } catch { /* fall through */ }
      onReceive(text ?? `You received ${formatSol(gained)} SOL on Devnet.`);
    }
    last = lamports;
  }
}
