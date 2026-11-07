import { getCompiledTransactionMessageDecoder, type Instruction, type ReadonlyUint8Array } from '@solana/kit';
export function validateCompiledTransfer(bytes: ReadonlyUint8Array, sender: string, recipient: string, amount: bigint): string {
  const decoded = getCompiledTransactionMessageDecoder().decode(bytes);
  if (decoded.version !== 0 || decoded.addressTableLookups?.length || decoded.instructions.length !== 1 || decoded.staticAccounts.length !== 3 || decoded.staticAccounts[0] !== sender || decoded.staticAccounts[1] !== recipient || decoded.staticAccounts[2] !== '11111111111111111111111111111111' || decoded.header.numSignerAccounts !== 1 || decoded.header.numReadonlySignerAccounts !== 0 || decoded.header.numReadonlyNonSignerAccounts !== 1) throw new Error('Only one native SOL transfer with the reviewed fee payer is allowed.');
  const instruction = decoded.instructions[0];
  if (instruction.programAddressIndex !== 2 || instruction.accountIndices?.length !== 2 || instruction.accountIndices[0] !== 0 || instruction.accountIndices[1] !== 1) throw new Error('Compiled transfer accounts do not match the review.');
  const hex = validateTransferInstruction({ programAddress: decoded.staticAccounts[2], accounts: [{ address: decoded.staticAccounts[0], role: 3 }, { address: decoded.staticAccounts[1], role: 1 }], data: instruction.data }, sender, recipient, amount);
  return `${sender}:${recipient}:${hex}`;
}
export function validateTransferInstruction(instruction: Instruction, sender: string, recipient: string, amount: bigint): string {
  if (sender === recipient || instruction.programAddress !== '11111111111111111111111111111111' || instruction.accounts?.length !== 2 || instruction.accounts[0].address !== sender || instruction.accounts[0].role !== 3 || instruction.accounts[1].address !== recipient || instruction.accounts[1].role !== 1 || instruction.data?.length !== 12) throw new Error('The built instruction does not match the reviewed native SOL transfer.');
  const data = new Uint8Array(instruction.data);
  const view = new DataView(data.buffer);
  if (view.getUint32(0, true) !== 2 || view.getBigUint64(4, true) !== amount) throw new Error('The encoded transfer amount does not match the reviewed amount.');
  return Array.from(data, byte => byte.toString(16).padStart(2, '0')).join('');
}
