import { address, signature, type Address } from '@solana/kit';
import { verifiedDevnetRpc } from '../../lib/devnet';
import { loadWallet } from '../wallet/service';
import { listContacts } from './service';

export type AddressRisk = {
  /** Known addresses sharing the first and last four characters but differing in the middle. */
  lookalikes: string[];
  isProgram: boolean;
  noHistory: boolean;
  /** The network check could not run; treat as unverified. */
  unchecked: boolean;
};

/** Address-poisoning pattern: same visible ends, different middle. */
export function findLookalikes(candidate: string, known: Iterable<string>): string[] {
  const out = new Set<string>();
  for (const k of known) {
    if (k !== candidate && k.slice(0, 4) === candidate.slice(0, 4) && k.slice(-4) === candidate.slice(-4)) out.add(k);
  }
  return [...out];
}

export function riskWarnings(risk: AddressRisk): string[] {
  const w: string[] = [];
  for (const k of risk.lookalikes) w.push(`Warning: this address starts and ends like another address you have used, ending ${k.slice(-4)}, but the middle is different. This is a common scam called address poisoning. Check every character with the recipient.`);
  if (risk.isProgram) w.push('Warning: this address is a program, not a person’s wallet. Payments to it may be lost.');
  if (risk.noHistory) w.push('Note: this address has no Devnet history yet. That is normal for a new wallet, but check it with the recipient.');
  if (risk.unchecked) w.push('The scam check could not reach Solana Devnet. Verify the full address with the recipient before saving.');
  return w;
}
export function needsSecondConfirmation(risk: AddressRisk) { return risk.lookalikes.length > 0 || risk.isProgram || risk.unchecked; }

async function counterparties(wallet: Address): Promise<string[]> {
  const client = await verifiedDevnetRpc();
  const abortSignal = AbortSignal.timeout(15000);
  const sigs = await client.getSignaturesForAddress(wallet, { commitment: 'confirmed', limit: 20 }).send({ abortSignal });
  const found = new Set<string>();
  for (const s of sigs) {
    const tx = await client.getTransaction(signature(s.signature), { commitment: 'confirmed', encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }).send({ abortSignal });
    for (const key of tx?.transaction.message.accountKeys ?? []) found.add(String(key.pubkey));
  }
  found.delete(wallet);
  return [...found];
}

export async function checkAddressRisk(candidate: string): Promise<AddressRisk> {
  const contacts = (await listContacts()).map(c => c.address);
  let lookalikes = findLookalikes(candidate, contacts);
  try {
    const wallet = await loadWallet();
    const client = await verifiedDevnetRpc();
    const abortSignal = AbortSignal.timeout(15000);
    const [info, history, known] = await Promise.all([
      client.getAccountInfo(address(candidate), { commitment: 'confirmed', encoding: 'base64' }).send({ abortSignal }),
      client.getSignaturesForAddress(address(candidate), { commitment: 'confirmed', limit: 1 }).send({ abortSignal }),
      wallet ? counterparties(address(wallet.address)) : Promise.resolve([]),
    ]);
    lookalikes = findLookalikes(candidate, [...contacts, ...known]);
    return { lookalikes, isProgram: Boolean(info.value?.executable), noHistory: history.length === 0, unchecked: false };
  } catch {
    return { lookalikes, isProgram: false, noHistory: false, unchecked: true };
  }
}
