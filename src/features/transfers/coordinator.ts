import { ApprovalGate } from './gate';
import { parseAmount, MAX_FEE } from './policy';
import { formatSol } from '../wallet/amount';

export type Candidate = Readonly<{
  sender: string; recipient: string; contactId: string; contactName: string; verifiedAt: string;
  amount: bigint; fee: bigint; balanceAfter: bigint; instructionsBytes: string; consentReceipt: string;
  lastValidBlockHeight: bigint; message: unknown;
}>;
export type Proposal = Readonly<Omit<Candidate, 'message' | 'lastValidBlockHeight'> & { id: string; network: 'devnet'; readbackText: string; maxFee: bigint }>;
export type SignedPayment = { signature: string; wire: string };
export type PaymentResult = { status: 'confirmed' | 'failed' | 'pending'; signature: string; message: string };
export interface TransferPorts {
  prepare(contactId: string, amount: bigint): Promise<Candidate>;
  reserve(proposal: Proposal): Promise<void>;
  saveSigned(proposal: Proposal, signed: SignedPayment, height: bigint): Promise<void>;
  failBeforeBroadcast(proposal: Proposal): Promise<void>;
  sign(candidate: Candidate): Promise<SignedPayment>;
  broadcast(wire: string, proposal: Proposal): Promise<unknown>;
  check(id: string): Promise<PaymentResult>;
}

export function paymentReadback(c: Candidate): string {
  return `Devnet test payment. Send ${formatSol(c.amount)} SOL to ${c.contactName}, saved contact, address ending ${c.recipient.slice(-4)}. Network fee ${formatSol(c.fee)} SOL. Estimated balance after: ${formatSol(c.balanceAfter)} SOL. Simulation passed, but does not guarantee confirmation. Maximum approved network fee: ${formatSol(c.fee)} SOL. A consent receipt, a fingerprint of this approval, will be recorded on-chain with the payment.`;
}
export function assertUnchanged(proposal: Proposal, next: Candidate) {
  if (next.sender !== proposal.sender || next.recipient !== proposal.recipient || next.contactId !== proposal.contactId || next.contactName !== proposal.contactName || next.verifiedAt !== proposal.verifiedAt || next.amount !== proposal.amount || next.instructionsBytes !== proposal.instructionsBytes || next.fee !== proposal.fee || next.fee > proposal.maxFee || next.balanceAfter !== proposal.balanceAfter) {
    throw new Error('Payment details changed. Nothing was submitted. Review a new payment.');
  }
}
export function createTransferCoordinator(ports: TransferPorts) {
  const proposals = new Map<string, { proposal: Proposal; gate: ApprovalGate }>();
  return {
    async prepare(contactId: string, amountText: string): Promise<Proposal> {
      const amount = parseAmount(amountText);
      const candidate = await ports.prepare(contactId, amount);
      if (candidate.amount !== amount || candidate.contactId !== contactId || candidate.fee < 0n || candidate.fee > MAX_FEE || candidate.balanceAfter < 0n) throw new Error('Network payment checks failed. Nothing was sent.');
      const { message: _message, lastValidBlockHeight: _height, ...terms } = candidate;
      void _message; void _height;
      const proposal: Proposal = Object.freeze({ ...terms, id: crypto.randomUUID(), network: 'devnet', maxFee: candidate.fee, readbackText: paymentReadback(candidate) });
      proposals.set(proposal.id, { proposal, gate: new ApprovalGate() });
      return proposal;
    },
    cancel(id: string) { proposals.get(id)?.gate.cancel(); proposals.delete(id); },
    async confirm(id: string, event: { isTrusted: boolean }): Promise<PaymentResult> {
      if (event.isTrusted !== true) throw new Error('Use the Confirm test payment button with your keyboard or pointer.');
      const stored = proposals.get(id);
      if (!stored) throw new Error('This review is no longer available. Review a new payment.');
      const { proposal, gate } = stored;
      gate.begin(); // synchronous before ANY await: duplicate clicks cannot race.
      let reserved = false; let broadcastStarted = false;
      try {
        const fresh = await ports.prepare(proposal.contactId, proposal.amount);
        gate.assertChecking(); assertUnchanged(proposal, fresh);
        await ports.reserve(proposal); reserved = true;
        gate.assertChecking();
        const signed = await ports.sign(fresh);
        gate.assertChecking();
        // Signature and identical signed bytes are durable BEFORE the first network send.
        await ports.saveSigned(proposal, signed, fresh.lastValidBlockHeight);
        gate.broadcast(); broadcastStarted = true;
        let sendError: unknown;
        try { await ports.broadcast(signed.wire, proposal); } catch (error) { sendError = error; /* Transport failure alone cannot prove rejection. */ }
        try {
          const result = await ports.check(proposal.id);
          return result.status === 'failed' && sendError instanceof Error ? { ...result, message: sendError.message } : result;
        }
        catch { return { status: 'pending', signature: signed.signature, message: 'Still checking whether the payment went through. Do not send again. Check Activity.' }; }
      } catch (error) {
        if (reserved && !broadcastStarted) await ports.failBeforeBroadcast(proposal);
        throw error;
      } finally { gate.finish(); proposals.delete(id); }
    },
  };
}
