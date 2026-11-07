import { describe, expect, it } from 'vitest';
import { incomingAnnouncement, incomingFromTransaction } from './incoming';

const wallet = 'WALLET1111111111111111111111111111111111111';
const sender = 'SENDER11111111111111111111111111111111119F2K';
const tx = (pre: bigint[], post: bigint[], err: unknown = null) => ({ transaction: { message: { accountKeys: [{ pubkey: sender }, { pubkey: wallet }, { pubkey: '11111111111111111111111111111111' }] } }, meta: { preBalances: pre, postBalances: post, err } });
describe('incoming payment detection', () => {
  it('finds the payer and exact amount from balance changes', () => {
    expect(incomingFromTransaction(tx([1_000_005_000n, 0n, 1n], [500_000_000n, 500_000_000n, 1n]), wallet)).toEqual({ from: sender, lamports: 500_000_000n });
  });
  it('ignores outgoing and failed transactions', () => {
    expect(incomingFromTransaction(tx([0n, 1_000n, 1n], [500n, 495n, 1n]), wallet)).toBeNull();
    expect(incomingFromTransaction(tx([1_000n, 0n, 1n], [0n, 1_000n, 1n], { InstructionError: [0, 'x'] }), wallet)).toBeNull();
  });
  it('names saved contacts and reads unknown senders only by their last four characters', () => {
    expect(incomingAnnouncement(500_000_000n, sender, 'Mum')).toBe('You received 0.5 SOL on Devnet from Mum.');
    expect(incomingAnnouncement(500_000_000n, sender)).toBe('You received 0.5 SOL on Devnet from an unknown address ending 9F2K.');
  });
});
