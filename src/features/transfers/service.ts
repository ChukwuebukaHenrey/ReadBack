import {
  address, appendTransactionMessageInstructions, compileTransaction, createSolanaRpc,
  createTransactionMessage, getBase64Decoder, getBase64EncodedWireTransaction,
  getSignatureFromTransaction, pipe, setTransactionMessageFeePayerSigner,
  getBase64Encoder, getTransactionDecoder, isSolanaError, SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
  setTransactionMessageLifetimeUsingBlockhash, signature, signTransactionMessageWithSigners,
  type Base64EncodedWireTransaction, type KeyPairSigner, type TransactionBlockhashLifetime, type TransactionMessageBytesBase64,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { listContacts } from '../contacts/service';
import { paymentSigner, GENESIS_HASH } from '../wallet/service';
import { validateCompiledTransfer } from './instruction';
import { checkDailyLimit, MAX_FEE } from './policy';
import { readLedger, reservePayment, spentToday, updatePayment } from './ledger';
import { createTransferCoordinator, type Candidate, type PaymentResult } from './coordinator';

function rpc() {
  const configured = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  if (configured.replace(/\/$/, '') !== 'https://api.devnet.solana.com') throw new Error('Only Solana Devnet is allowed. Nothing was sent.');
  return createSolanaRpc(new URL('/api/devnet', window.location.origin).href);
}
async function verifiedRpc() {
  const client = rpc();
  const hash = await client.getGenesisHash().send({ abortSignal: AbortSignal.timeout(12000) });
  if (hash !== GENESIS_HASH) throw new Error('Network verification failed. This is not Solana Devnet. Nothing was signed.');
  return client;
}
function buildMessage(signer: KeyPairSigner, recipient: string, amount: bigint, lifetime: TransactionBlockhashLifetime) {
  return pipe(createTransactionMessage({ version: 0 }),
    m => setTransactionMessageFeePayerSigner(signer, m),
    m => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
    m => appendTransactionMessageInstructions([getTransferSolInstruction({ source: signer, destination: address(recipient), amount })], m));
}
const messages = new WeakMap<Candidate, ReturnType<typeof buildMessage>>();

const EXPIRED_MESSAGE = 'This payment expired before Solana Devnet processed it. No SOL left your wallet. You can review a new payment.';
const REJECTED_MESSAGE = 'Solana Devnet rejected this payment before processing it. No SOL left your wallet.';
/** A reservation that was never signed cannot reach the network; release it after this long. */
const STALE_RESERVATION_MS = 2 * 60_000;

export async function checkPayment(id: string): Promise<PaymentResult> {
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
  const message = buildMessage(signer, contact.address, amount, latest.value);
  const unsigned = compileTransaction(message);
  const instructionsBytes = validateCompiledTransfer(unsigned.messageBytes, signer.address, contact.address, amount);
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
  const candidate: Candidate = Object.freeze({ sender: signer.address, recipient: contact.address, contactId, contactName: contact.name, verifiedAt: contact.verifiedAt, amount, fee, balanceAfter: senderAfter.lamports, instructionsBytes, lastValidBlockHeight: latest.value.lastValidBlockHeight, message });
  messages.set(candidate, message);
  return candidate;
}

export const transfers = createTransferCoordinator({
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
    if (validateCompiledTransfer(compileTransaction(message).messageBytes, candidate.sender, candidate.recipient, candidate.amount) !== candidate.instructionsBytes) throw new Error('Payment instructions changed. Nothing was signed.');
    const signed = await signTransactionMessageWithSigners(message);
    validateCompiledTransfer(signed.messageBytes, candidate.sender, candidate.recipient, candidate.amount);
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
