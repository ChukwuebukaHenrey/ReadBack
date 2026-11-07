import { z } from 'zod';
import { checkedText } from './refusals';

const sol = z.string().regex(/^\d+(\.\d{1,9})?$/);
/** Facts only. The contact name is never sent to the AI; it is "a saved contact". */
export const transactionFactSchema = z.object({
  kind: z.literal('transaction'),
  direction: z.literal('sent'),
  amountSol: sol,
  status: z.enum(['confirmed', 'failed', 'unresolved']),
  feeSol: sol.optional(),
  consentReceipt: z.boolean(),
}).strict();
export type TransactionFact = z.infer<typeof transactionFactSchema>;

export function transactionTemplate(fact: TransactionFact, counterpart = 'a saved contact') {
  const status = fact.status === 'confirmed' ? 'Solana Devnet confirmed it.' : fact.status === 'failed' ? 'It did not go through.' : 'Its outcome is still being checked. Do not send it again.';
  const fee = fact.feeSol ? ` The network fee was ${fact.feeSol} SOL.` : '';
  const receipt = fact.consentReceipt && fact.status === 'confirmed' ? ' A consent receipt was recorded on-chain with it.' : '';
  return `You sent ${fact.amountSol} SOL to ${counterpart} on Devnet. ${status}${fee}${receipt}`;
}
export function checkedTransactionExplanation(text: string, fact: TransactionFact) {
  return checkedText(text, fact, transactionTemplate(fact));
}
export async function explainTransaction(fact: TransactionFact, signal: AbortSignal) {
  const response = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fact), signal });
  if (!response.ok) return transactionTemplate(fact);
  const parsed = z.object({ explanation: z.string().max(350) }).strict().parse(await response.json());
  return checkedTransactionExplanation(parsed.explanation, fact);
}
