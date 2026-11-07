import { describe, expect, it } from 'vitest';
import { address, createNoopSigner, createTransactionMessage, setTransactionMessageFeePayer, setTransactionMessageLifetimeUsingBlockhash, appendTransactionMessageInstructions, compileTransaction, blockhash, pipe } from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { validateTransferInstruction, validateCompiledTransfer } from './instruction';
describe('native transfer instruction equivalence', () => {
  const sender = address('4AKNMLm1eQKdxNFUW26yJSmM6UuyKSkGYt5fvQMbDsup');
  const recipient = address('11111111111111111111111111111112');
  const build = () => getTransferSolInstruction({ source: createNoopSigner(sender), destination: recipient, amount: 10_000_000n });
  const compiled = (duplicate = false) => compileTransaction(pipe(createTransactionMessage({ version: 0 }), m => setTransactionMessageFeePayer(sender, m), m => setTransactionMessageLifetimeUsingBlockhash({ blockhash: blockhash('11111111111111111111111111111111'), lastValidBlockHeight: 100n }, m), m => appendTransactionMessageInstructions(duplicate ? [build(), build()] : [build()], m)));
  it('decodes the compiled message and rejects additional instructions and different payees', () => {
    expect(validateCompiledTransfer(compiled().messageBytes, sender, recipient, 10_000_000n)).toContain(sender);
    expect(() => validateCompiledTransfer(compiled(true).messageBytes, sender, recipient, 10_000_000n)).toThrow();
    expect(() => validateCompiledTransfer(compiled().messageBytes, sender, sender, 10_000_000n)).toThrow();
  });
  it('decodes the exact System transfer bytes and accounts', () => { expect(validateTransferInstruction(build(), sender, recipient, 10_000_000n)).toHaveLength(24); });
  it('rejects changed amounts, recipients, programs and extra accounts', () => {
    const instruction = build();
    expect(() => validateTransferInstruction(instruction, sender, recipient, 1n)).toThrow();
    expect(() => validateTransferInstruction(instruction, sender, sender, 10_000_000n)).toThrow();
    expect(() => validateTransferInstruction({ ...instruction, programAddress: recipient }, sender, recipient, 10_000_000n)).toThrow();
    expect(() => validateTransferInstruction({ ...instruction, accounts: [...instruction.accounts, instruction.accounts[0]] }, sender, recipient, 10_000_000n)).toThrow();
  });
});
