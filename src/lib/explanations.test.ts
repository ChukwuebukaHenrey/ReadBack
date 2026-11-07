import { describe, expect, it } from 'vitest';
import { checkedTransactionExplanation, transactionFactSchema, transactionTemplate, type TransactionFact } from './explanations';

const fact: TransactionFact = { kind: 'transaction', direction: 'sent', amountSol: '0.2', status: 'confirmed', feeSol: '0.000005', consentReceipt: true };
describe('transaction explanations (G16)', () => {
  it('uses exact facts in the fixed template', () => {
    expect(transactionTemplate(fact, 'Mum')).toBe('You sent 0.2 SOL to Mum on Devnet. Solana Devnet confirmed it. The network fee was 0.000005 SOL. A consent receipt was recorded on-chain with it.');
  });
  it('discards AI text with numbers that are not in the facts', () => {
    expect(checkedTransactionExplanation('You sent 5 SOL and it was confirmed.', fact)).toBe(transactionTemplate(fact));
    expect(checkedTransactionExplanation('You sent 0.2 SOL to a saved contact and Devnet confirmed it.', fact)).toBe('You sent 0.2 SOL to a saved contact and Devnet confirmed it.');
  });
  it('accepts no names, addresses or extra fields in facts', () => {
    expect(() => transactionFactSchema.parse({ ...fact, contactName: 'Mum' })).toThrow();
    expect(() => transactionFactSchema.parse({ ...fact, amountSol: 'all' })).toThrow();
  });
});
