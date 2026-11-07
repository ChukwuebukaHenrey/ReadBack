import { address, getCompiledTransactionMessageDecoder, type Instruction, type ReadonlyUint8Array } from '@solana/kit';
import { getAddMemoInstruction } from '@solana-program/memo';

export const SYSTEM_PROGRAM = '11111111111111111111111111111111';
/** Canonical SPL Memo v2 under the immutable BPF loader. Pinned rather than the package default. */
export const MEMO_PROGRAM = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
const RECEIPT = /^readback:v1:[0-9a-f]{64}$/;

/** The exact words the person approves; its hash is the on-chain consent receipt. */
export function consentStatement(sender: string, recipient: string, amountSol: string, contactName: string) {
  return `Devnet test payment. Send ${amountSol} SOL to ${contactName}, saved contact, address ${recipient}, from ${sender}.`;
}
export async function consentReceipt(statement: string) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(statement)));
  return `readback:v1:${Array.from(digest, b => b.toString(16).padStart(2, '0')).join('')}`;
}
export function receiptInstruction(receipt: string) {
  if (!RECEIPT.test(receipt)) throw new Error('Invalid consent receipt.');
  return getAddMemoInstruction({ memo: receipt }, { programAddress: address(MEMO_PROGRAM) });
}

/**
 * Decodes the compiled message and allows exactly: one System transfer (sender → recipient, amount)
 * and one Memo carrying a Readback consent receipt. Anything else aborts.
 */
export function validateCompiledTransfer(bytes: ReadonlyUint8Array, sender: string, recipient: string, amount: bigint, receipt?: string): string {
  const decoded = getCompiledTransactionMessageDecoder().decode(bytes);
  const keys = decoded.staticAccounts;
  const ONLY = 'Only one native SOL transfer and its consent receipt are allowed.';
  if (decoded.version !== 0 || decoded.addressTableLookups?.length || decoded.instructions.length !== 2 || keys.length !== 4 || keys[0] !== sender || keys[1] !== recipient || decoded.header.numSignerAccounts !== 1 || decoded.header.numReadonlySignerAccounts !== 0 || decoded.header.numReadonlyNonSignerAccounts !== 2) throw new Error(ONLY);
  const systemIndex = keys.indexOf(SYSTEM_PROGRAM as typeof keys[number]);
  const memoIndex = keys.indexOf(MEMO_PROGRAM as typeof keys[number]);
  if (systemIndex < 2 || memoIndex < 2) throw new Error(ONLY);
  const [transfer, memo] = decoded.instructions;
  if (transfer.programAddressIndex !== systemIndex || transfer.accountIndices?.length !== 2 || transfer.accountIndices[0] !== 0 || transfer.accountIndices[1] !== 1) throw new Error('Compiled transfer accounts do not match the review.');
  const hex = validateTransferInstruction({ programAddress: keys[systemIndex], accounts: [{ address: keys[0], role: 3 }, { address: keys[1], role: 1 }], data: transfer.data }, sender, recipient, amount);
  if (memo.programAddressIndex !== memoIndex || memo.accountIndices?.length) throw new Error('The consent receipt instruction is not allowed.');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(memo.data ?? []));
  if (!RECEIPT.test(text) || (receipt !== undefined && text !== receipt)) throw new Error('The consent receipt does not match the review.');
  return `${sender}:${recipient}:${hex}:${text}`;
}

export function validateTransferInstruction(instruction: Instruction, sender: string, recipient: string, amount: bigint): string {
  if (sender === recipient || instruction.programAddress !== SYSTEM_PROGRAM || instruction.accounts?.length !== 2 || instruction.accounts[0].address !== sender || instruction.accounts[0].role !== 3 || instruction.accounts[1].address !== recipient || instruction.accounts[1].role !== 1 || instruction.data?.length !== 12) throw new Error('The built instruction does not match the reviewed native SOL transfer.');
  const data = new Uint8Array(instruction.data);
  const view = new DataView(data.buffer);
  if (view.getUint32(0, true) !== 2 || view.getBigUint64(4, true) !== amount) throw new Error('The encoded transfer amount does not match the reviewed amount.');
  return Array.from(data, byte => byte.toString(16).padStart(2, '0')).join('');
}
