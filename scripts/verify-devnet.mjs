// Read-only live check. This script NEVER signs or broadcasts a transaction.
import process from 'node:process';
import console from 'node:console';
import { address, appendTransactionMessageInstructions, compileTransaction, createNoopSigner, createSolanaRpc, createTransactionMessage, generateKeyPairSigner, getBase64Decoder, getBase64EncodedWireTransaction, pipe, setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash } from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { validateCompiledTransfer, consentReceipt, consentStatement, receiptInstruction } from '../src/features/transfers/instruction.ts';

const base = process.env.READBACK_TEST_URL || 'http://127.0.0.1:5173';
const rpc = createSolanaRpc(`${base}/api/devnet`);
const sender = createNoopSigner(address('4AKNMLm1eQKdxNFUW26yJSmM6UuyKSkGYt5fvQMbDsup'));
const recipient = (await generateKeyPairSigner(false)).address;
const amount = 1_000_000n;
const hash = await rpc.getGenesisHash().send();
if (hash !== 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG') throw new Error('Wrong network');
const balance = await rpc.getBalance(sender.address, { commitment: 'confirmed' }).send();
const { value: lifetime } = await rpc.getLatestBlockhash({ commitment: 'confirmed' }).send();
const receipt = await consentReceipt(consentStatement(sender.address, recipient, '0.001', 'Verify'));
const message = pipe(createTransactionMessage({ version: 0 }), m => setTransactionMessageFeePayerSigner(sender, m), m => setTransactionMessageLifetimeUsingBlockhash(lifetime, m), m => appendTransactionMessageInstructions([getTransferSolInstruction({ source: sender, destination: recipient, amount }), receiptInstruction(receipt)], m));
const unsigned = compileTransaction(message);
validateCompiledTransfer(unsigned.messageBytes, sender.address, recipient, amount, receipt);
const fee = await rpc.getFeeForMessage(getBase64Decoder().decode(unsigned.messageBytes), { commitment: 'confirmed' }).send();
const simulation = await rpc.simulateTransaction(getBase64EncodedWireTransaction(unsigned), { encoding: 'base64', commitment: 'confirmed', sigVerify: false, replaceRecentBlockhash: false, accounts: { encoding: 'base64', addresses: [sender.address, recipient] } }).send();
if (simulation.value.err) throw new Error('Live simulation rejected the candidate. No transaction was sent.');
if (fee.value === null || simulation.value.accounts?.[0]?.lamports !== balance.value - amount - fee.value) throw new Error('Live simulated balances do not match the decoded amount and fee.');
console.log(JSON.stringify({ network: 'devnet', source: sender.address, balance: balance.value.toString(), slot: balance.context.slot.toString(), amount: amount.toString(), fee: fee.value.toString(), simulatedBalanceAfter: simulation.value.accounts[0].lamports.toString(), simulationSlot: simulation.context.slot.toString(), signed: false, broadcast: false }));
