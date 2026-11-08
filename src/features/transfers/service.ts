import {
  address, appendTransactionMessageInstructions, compileTransaction,
  createTransactionMessage, getBase64Decoder, getBase64EncodedWireTransaction,
  getSignatureFromTransaction, pipe, setTransactionMessageFeePayerSigner,
  getBase64Encoder, getTransactionDecoder, isSolanaError, SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
  setTransactionMessageLifetimeUsingBlockhash, signature, signTransactionMessageWithSigners,
  type Base64EncodedWireTransaction, type KeyPairSigner, type TransactionBlockhashLifetime, type TransactionMessageBytesBase64,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { listContacts } from '../contacts/service';
import { paymentSigner } from '../wallet/service';
import { devnetRpc, verifiedDevnetRpc } from '../../lib/devnet';
import { consentReceipt, consentStatement, receiptInstruction, validateCompiledTransfer } from './instruction';
import { formatSol } from '../wallet/amount';
import { checkDailyLimit, MAX_FEE } from './policy';
import { readLedger, reservePayment, spentToday, updatePayment } from './ledger';
import { createTransferCoordinator, type Candidate, type PaymentResult, type Proposal } from './coordinator';
import { parseAmount } from './policy';
import { isDemo, demoContacts, demoBalance, demoEntries, recordDemoPayment, DEMO_ADDRESS } from '../demo/demo';

const rpc = devnetRpc;
const verifiedRpc = verifiedDevnetRpc;
function buildMessage(signer: KeyPairSigner, recipient: string, amount: bigint, receipt: string, lifetime: TransactionBlockhashLifetime) {
  return pipe(createTransactionMessage({ version: 0 }),
    m => setTransactionMessageFeePayerSigner(signer, m),
    m => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
    m => appendTransactionMessageInstructions([getTransferSolInstruction({ source: signer, destination: address(recipient), amount }), receiptInstruction(receipt)], m));
}
const messages = new WeakMap<Candidate, ReturnType<typeof buildMessage>>();

const EXPIRED_MESSAGE = 'This payment expired before Solana Devnet processed it. No SOL left your wallet. You can review a new payment.';
const REJECTED_MESSAGE = 'Solana Devnet rejected this payment before processing it. No SOL left your wallet.';
/** A reservation that was never signed cannot reach the network; release it after this long. */
const STALE_RESERVATION_MS = 2 * 60_000;

export async function checkPayment(id: string): Promise<PaymentResult> {
  if (isDemo()) { const e = demoEntries().find(x => x.id === id); if (!e) throw new Error('No demo payment found.'); return { status: 'confirmed', signature: e.signature, message: 'Demo payment recorded. Nothing was sent to Solana.' }; }
  const entry = (await readLedger()).find(item => item.id === id);
  if (!entry?.signature) throw new Error('No submitted signature is recorded for this payment.');
  // Confirmed and failed are terminal: never re-query or reinterpret them.
  if (entry.status === 'confirmed') return { status: 'confirmed', signature: entry.signature, message: 'Payment confirmed on Solana Devnet.' };
  if (entry.status === 'failed') return { status: 'failed', signature: entry.signature, message: 'This payment did not go through. Check Activity for details.' };
  const client = await verifiedRpc();
  const lookup = async () => (await client.getSignatureStatuses([signature(entry.signature!)], { searchTransactionHistory: true }).send({ abortSignal: AbortSignal.timeout(12000) })).value[0];
  const result = await lookup();
  if (result && (result.confirmationStatus === 'confirmed' || result.confirmationStatus === 'finalized')) {
    const status = result.err ? 'failed' : 'confirmed';
    await updatePayment(id, status);
    return { status, signature: entry.signature, message: result.err ? 'The network confirmed that this payment failed. A network fee may have been charged.' : 'Payment confirmed on Solana Devnet.' };
  }
  if (!result && entry.lastValidBlockHeight) {
    // Past lastValidBlockHeight, a transaction that was never seen can never land.
    const height = await client.getBlockHeight({ commitment: 'confirmed' }).send({ abortSignal: AbortSignal.timeout(12000) });
    if (height > BigInt(entry.lastValidBlockHeight) && !(await lookup())) {
      await updatePayment(id, 'failed');
      return { status: 'failed', signature: entry.signature, message: EXPIRED_MESSAGE };
    }
  }
  return { status: 'pending', signature: entry.signature, message: 'Still checking whether the payment went through. Do not send again.' };
}

/** Poll the one known signature until it is confirmed, failed or expired. Never rebroadcasts. */
export async function waitForPayment(id: string, attempts = 20, intervalMs = 1500): Promise<PaymentResult> {
  let last: PaymentResult | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try { last = await checkPayment(id); if (last.status !== 'pending') return last; }
    catch { /* A failed status read proves nothing; keep checking the same signature. */ }
    if (attempt < attempts - 1) await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  if (last) return last;
  throw new Error('Could not reach the network to check this payment.');
}

export async function refreshPaymentStatuses() {
  if (isDemo()) return readLedger();
  const entries = await readLedger();
  const now = Date.now();
  for (const entry of entries) {
    if (entry.status === 'reserved' && !entry.signature && now - Date.parse(entry.createdAt) > STALE_RESERVATION_MS) await updatePayment(entry.id, 'failed');
    else if (entry.signature && (entry.status === 'submitted' || entry.status === 'submission_unknown')) {
      try { await checkPayment(entry.id); } catch { /* Leave unresolved; the caller still sees it as unresolved. */ }
    }
  }
  return readLedger();
}

function isPreflightRejection(error: unknown) {
  if (!isSolanaError(error, SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE)) return false;
  // AlreadyProcessed means it landed: that is not a rejection.
  return !JSON.stringify(error.cause ?? '', (_k, v) => typeof v === 'bigint' ? v.toString() : v).includes('AlreadyProcessed');
}

async function prepare(contactId: string, amount: bigint): Promise<Candidate> {
  const contact = (await listContacts()).find(c => c.id === contactId);
  if (!contact) throw new Error('I only send to saved contacts. Add and independently verify the recipient first.');
  const signer = await paymentSigner();
  if (contact.address === signer.address) throw new Error('Choose another verified recipient. Sending to this wallet itself is not supported.');
  const client = await verifiedRpc();
  const records = await refreshPaymentStatuses();
  if (records.some(e => e.sender === signer.address && ['reserved', 'submission_unknown', 'submitted'].includes(e.status))) throw new Error('An earlier payment is unresolved. Check Activity before preparing another payment.');
  checkDailyLimit(spentToday(records, signer.address), amount);
  const abortSignal = AbortSignal.timeout(15000);
  const [balance, latest] = await Promise.all([
    client.getBalance(signer.address, { commitment: 'confirmed' }).send({ abortSignal }),
    client.getLatestBlockhash({ commitment: 'confirmed' }).send({ abortSignal }),
  ]);
  if (balance.value <= amount) throw new Error('Your balance must cover both the payment and the network fee. Nothing was sent.');
  const receipt = await consentReceipt(consentStatement(signer.address, contact.address, formatSol(amount), contact.name));
  const message = buildMessage(signer, contact.address, amount, receipt, latest.value);
  const unsigned = compileTransaction(message);
  const instructionsBytes = validateCompiledTransfer(unsigned.messageBytes, signer.address, contact.address, amount, receipt);
  const estimate = await client.getFeeForMessage(getBase64Decoder().decode(unsigned.messageBytes) as TransactionMessageBytesBase64, { commitment: 'confirmed' }).send({ abortSignal });
  if (estimate.value === null || estimate.value < 0n || estimate.value > MAX_FEE) throw new Error('A safe network fee could not be verified. Nothing was sent.');
  const fee = estimate.value;
  if (balance.value < amount + fee) throw new Error('Your balance is too low for this amount and the network fee. Nothing was sent.');
  const simulated = await client.simulateTransaction(getBase64EncodedWireTransaction(unsigned), {
    encoding: 'base64', commitment: 'confirmed', sigVerify: false, replaceRecentBlockhash: false,
    accounts: { encoding: 'base64', addresses: [signer.address, address(contact.address)] },
  }).send({ abortSignal });
  if (simulated.value.err) throw new Error('Simulation failed. Nothing was sent. Check the balance and recipient; a new recipient may need more test SOL to meet the account minimum.');
  const [senderAfter, recipientAfter] = simulated.value.accounts ?? [];
  const expectedAfter = balance.value - amount - fee;
  if (!senderAfter || !recipientAfter || senderAfter.executable || recipientAfter.executable || senderAfter.lamports !== expectedAfter) throw new Error('Simulation balances could not be matched to the payment. Nothing was sent. Refresh and review again.');
  const candidate: Candidate = Object.freeze({ sender: signer.address, recipient: contact.address, contactId, contactName: contact.name, verifiedAt: contact.verifiedAt, amount, fee, balanceAfter: senderAfter.lamports, instructionsBytes, consentReceipt: receipt, lastValidBlockHeight: latest.value.lastValidBlockHeight, message });
  messages.set(candidate, message);
  return candidate;
}

const realTransfers = createTransferCoordinator({
  prepare,
  async reserve(p) {
    const now = new Date().toISOString();
    await reservePayment({ id: p.id, day: now.slice(0, 10), createdAt: now, amount: p.amount.toString(), sender: p.sender, recipient: p.recipient, name: p.contactName, status: 'reserved' });
  },
  saveSigned: (p, signed, height) => updatePayment(p.id, 'submission_unknown', signed.signature, { signedWire: signed.wire, lastValidBlockHeight: height.toString() }),
  failBeforeBroadcast: p => updatePayment(p.id, 'failed'),
  async sign(candidate) {
    const message = messages.get(candidate);
    if (!message) throw new Error('Payment preparation was lost. Review again.');
    await verifiedRpc();
    const current = (await listContacts()).find(c => c.id === candidate.contactId);
    if (!current || current.address !== candidate.recipient || current.name !== candidate.contactName || current.verifiedAt !== candidate.verifiedAt) throw new Error('The saved contact changed. Review again.');
    if (validateCompiledTransfer(compileTransaction(message).messageBytes, candidate.sender, candidate.recipient, candidate.amount, candidate.consentReceipt) !== candidate.instructionsBytes) throw new Error('Payment instructions changed. Nothing was signed.');
    const signed = await signTransactionMessageWithSigners(message);
    validateCompiledTransfer(signed.messageBytes, candidate.sender, candidate.recipient, candidate.amount, candidate.consentReceipt);
    messages.delete(candidate);
    return { signature: getSignatureFromTransaction(signed), wire: getBase64EncodedWireTransaction(signed) };
  },
  async broadcast(wire, proposal) {
    try {
      await rpc().sendTransaction(wire as Base64EncodedWireTransaction, { encoding: 'base64', skipPreflight: false, preflightCommitment: 'confirmed', maxRetries: 0n }).send({ abortSignal: AbortSignal.timeout(12000) });
      await updatePayment(proposal.id, 'submitted');
    } catch (error) {
      // First and only send of these bytes: a preflight rejection means the node never forwarded them.
      if (isPreflightRejection(error)) { await updatePayment(proposal.id, 'failed'); throw new Error(REJECTED_MESSAGE); }
      throw error;
    }
  },
  check: id => waitForPayment(id),
});

/** Explicit recovery only: never rebuild or sign, and never automatically retry a send. */
export async function resendSamePayment(id: string): Promise<PaymentResult> {
  if (isDemo()) throw new Error('Demo payments are never sent.');
  const checked = await checkPayment(id);
  if (checked.status !== 'pending') return checked;
  // Explicit, user-initiated resend of the identical signed bytes only.
  const entry = (await readLedger()).find(e => e.id === id);
  if (!entry?.signedWire || !entry.lastValidBlockHeight) throw new Error('The original signed payment is unavailable. Keep checking its signature; do not send again.');
  const signer = await paymentSigner();
  if (signer.address !== entry.sender) throw new Error('This payment belongs to another wallet.');
  const decoded = getTransactionDecoder().decode(getBase64Encoder().encode(entry.signedWire));
  validateCompiledTransfer(decoded.messageBytes, entry.sender, entry.recipient, BigInt(entry.amount));
  if (getSignatureFromTransaction(decoded) !== entry.signature) throw new Error('The stored signature does not match the signed payment. Nothing was resubmitted.');
  const client = await verifiedRpc();
  const height = await client.getBlockHeight({ commitment: 'confirmed' }).send({ abortSignal: AbortSignal.timeout(12000) });
  if (height > BigInt(entry.lastValidBlockHeight)) throw new Error('The original blockhash expired. No replacement was created. Check the Explorer signature before making another payment.');
  try { await client.sendTransaction(entry.signedWire as Base64EncodedWireTransaction, { encoding: 'base64', skipPreflight: false, preflightCommitment: 'confirmed', maxRetries: 0n }).send({ abortSignal: AbortSignal.timeout(12000) }); } catch { /* Check the same signature. */ }
  return waitForPayment(id, 10);
}

/** Demo payments: same amount, limit and contact checks; recorded locally; never signed or sent. */
const DEMO_FEE = 5000n;
const demoProposals = new Map<string, Proposal>();
const demoTransfers = {
  async prepare(contactId: string, amountText: string): Promise<Proposal> {
    const amount = parseAmount(amountText);
    const contact = demoContacts.find(c => c.id === contactId);
    if (!contact) throw new Error('I only send to saved contacts. Add and independently verify the recipient first.');
    checkDailyLimit(spentToday(demoEntries(), DEMO_ADDRESS), amount);
    const balance = demoBalance();
    if (balance < amount + DEMO_FEE) throw new Error('The demo balance is too low for this amount and the fee. Nothing was sent.');
    const balanceAfter = balance - amount - DEMO_FEE;
    const proposal: Proposal = Object.freeze({
      id: crypto.randomUUID(), network: 'devnet', sender: DEMO_ADDRESS, recipient: contact.address, contactId, contactName: contact.name,
      verifiedAt: contact.verifiedAt, amount, fee: DEMO_FEE, maxFee: DEMO_FEE, balanceAfter, instructionsBytes: 'demo', consentReceipt: 'demo',
      readbackText: `Demo payment. Nothing is sent to Solana. Send ${formatSol(amount)} SOL to ${contact.name}, saved contact, address ending ${contact.address.slice(-4)}. Example network fee ${formatSol(DEMO_FEE)} SOL. Demo balance after: ${formatSol(balanceAfter)} SOL.`,
    });
    demoProposals.set(proposal.id, proposal);
    return proposal;
  },
  cancel(id: string) { demoProposals.delete(id); },
  async confirm(id: string, event: { isTrusted: boolean }): Promise<PaymentResult> {
    if (event.isTrusted !== true) throw new Error('Use the Confirm test payment button with your keyboard or pointer.');
    const proposal = demoProposals.get(id);
    if (!proposal) throw new Error('This review is no longer available. Review a new payment.');
    demoProposals.delete(id);
    await new Promise(resolve => setTimeout(resolve, 500));
    const entry = recordDemoPayment(proposal.contactId, proposal.amount);
    return { status: 'confirmed', signature: entry.signature, message: 'Demo payment recorded. Nothing was sent to Solana.' };
  },
};
export const transfers = {
  prepare: (contactId: string, amountText: string) => (isDemo() ? demoTransfers : realTransfers).prepare(contactId, amountText),
  cancel: (id: string) => { demoTransfers.cancel(id); realTransfers.cancel(id); },
  confirm: (id: string, event: { isTrusted: boolean }) => (isDemo() ? demoTransfers : realTransfers).confirm(id, event),
};
