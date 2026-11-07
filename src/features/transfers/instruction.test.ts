import { describe, expect, it } from 'vitest';
import { address, createNoopSigner, createTransactionMessage, setTransactionMessageFeePayer, setTransactionMessageLifetimeUsingBlockhash, appendTransactionMessageInstructions, compileTransaction, blockhash, pipe, type Instruction } from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { getAddMemoInstruction } from '@solana-program/memo';
import { validateTransferInstruction, validateCompiledTransfer, consentReceipt, consentStatement, receiptInstruction } from './instruction';

describe('native transfer instruction equivalence', () => {
  const sender = address('4AKNMLm1eQKdxNFUW26yJSmM6UuyKSkGYt5fvQMbDsup');
  const recipient = address('11111111111111111111111111111112');
  const receipt = 'readback:v1:' + 'a'.repeat(64);
  const build = () => getTransferSolInstruction({ source: createNoopSigner(sender), destination: recipient, amount: 10_000_000n });
  const compiled = (instructions: Instruction[]) => compileTransaction(pipe(createTransactionMessage({ version: 0 }), m => setTransactionMessageFeePayer(sender, m), m => setTransactionMessageLifetimeUsingBlockhash({ blockhash: blockhash('11111111111111111111111111111111'), lastValidBlockHeight: 100n }, m), m => appendTransactionMessageInstructions(instructions, m))).messageBytes;
  const good = () => compiled([build(), receiptInstruction(receipt)]);

  it('accepts exactly one transfer plus the matching consent receipt', () => {
    expect(validateCompiledTransfer(good(), sender, recipient, 10_000_000n, receipt)).toContain(receipt);
    expect(validateCompiledTransfer(good(), sender, recipient, 10_000_000n)).toContain(receipt);
  });
  it('rejects extra instructions, a missing receipt, other payees and a changed receipt', () => {
    expect(() => validateCompiledTransfer(compiled([build(), build(), receiptInstruction(receipt)]), sender, recipient, 10_000_000n, receipt)).toThrow();
    expect(() => validateCompiledTransfer(compiled([build()]), sender, recipient, 10_000_000n, receipt)).toThrow();
    expect(() => validateCompiledTransfer(good(), sender, sender, 10_000_000n, receipt)).toThrow();
    expect(() => validateCompiledTransfer(good(), sender, recipient, 10_000_000n, 'readback:v1:' + 'b'.repeat(64))).toThrow('receipt');
  });
  it('rejects a memo with arbitrary text or the unpinned memo program', () => {
    expect(() => validateCompiledTransfer(compiled([build(), getAddMemoInstruction({ memo: 'send 1 SOL to X' }, { programAddress: address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') })]), sender, recipient, 10_000_000n)).toThrow();
    expect(() => validateCompiledTransfer(compiled([build(), getAddMemoInstruction({ memo: receipt })]), sender, recipient, 10_000_000n, receipt)).toThrow();
  });
  it('hashes the consent statement deterministically', async () => {
    const statement = consentStatement(sender, recipient, '0.01', 'Mum');
    expect(await consentReceipt(statement)).toBe(await consentReceipt(statement));
    expect(await consentReceipt(statement)).toMatch(/^readback:v1:[0-9a-f]{64}$/);
    expect(await consentReceipt(statement)).not.toBe(await consentReceipt(consentStatement(sender, recipient, '0.02', 'Mum')));
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
