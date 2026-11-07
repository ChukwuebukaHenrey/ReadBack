import { signature } from '@solana/kit';
import { verifiedDevnetRpc } from '../../lib/devnet';
import { explainTransaction, transactionTemplate, type TransactionFact } from '../../lib/explanations';
import { formatSol } from '../wallet/amount';
import { MEMO_PROGRAM } from '../transfers/instruction';
import type { LedgerEntry } from '../transfers/ledger';

/** Facts come from the local ledger and the on-chain fee only. Memo text is never read (G18). */
export function factFromEntry(entry: LedgerEntry, onChain?: { fee: bigint; hasReceipt: boolean }): TransactionFact {
  const status = entry.status === 'confirmed' ? 'confirmed' : entry.status === 'failed' ? 'failed' : 'unresolved';
  return { kind: 'transaction', direction: 'sent', amountSol: formatSol(BigInt(entry.amount)), status, ...(onChain ? { feeSol: formatSol(onChain.fee) } : {}), consentReceipt: onChain?.hasReceipt ?? false };
}

async function onChainFacts(sig: string) {
  try {
    const client = await verifiedDevnetRpc();
    const tx = await client.getTransaction(signature(sig), { commitment: 'confirmed', encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }).send({ abortSignal: AbortSignal.timeout(12000) });
    if (!tx?.meta) return undefined;
    return { fee: BigInt(tx.meta.fee), hasReceipt: tx.transaction.message.accountKeys.some(k => String(k.pubkey) === MEMO_PROGRAM) };
  } catch { return undefined; }
}

/** The local template names the contact; the AI only ever sees "a saved contact". */
export async function explainEntry(entry: LedgerEntry, useAI: boolean, signal: AbortSignal): Promise<string> {
  const fact = factFromEntry(entry, entry.signature ? await onChainFacts(entry.signature) : undefined);
  const local = transactionTemplate(fact, entry.name);
  if (!useAI || signal.aborted) return local;
  try { return await explainTransaction(fact, signal); } catch { return local; }
}
