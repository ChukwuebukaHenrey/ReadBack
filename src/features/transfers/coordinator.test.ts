import { describe, expect, it, vi } from 'vitest';
import { createTransferCoordinator, type Candidate, type TransferPorts } from './coordinator';
function fixture() {
  const candidate: Candidate = { sender: 'sender', recipient: 'recipientABCD', contactId: 'mum', contactName: 'Mum', verifiedAt: '2026-11-07', amount: 200_000_000n, fee: 5000n, balanceAfter: 799_995_000n, instructionsBytes: 'fixed-terms', consentReceipt: 'readback:v1:' + '0'.repeat(64), lastValidBlockHeight: 100n, message: {} };
  const order: string[] = [];
  const ports: TransferPorts = {
    prepare: vi.fn().mockResolvedValue(candidate), reserve: vi.fn(async () => { order.push('reserve'); }),
    saveSigned: vi.fn(async () => { order.push('save'); }), failBeforeBroadcast: vi.fn().mockResolvedValue(undefined),
    sign: vi.fn(async () => { order.push('sign'); return { signature: 'known-signature', wire: 'same-signed-bytes' }; }),
    broadcast: vi.fn(async () => { order.push('broadcast'); }),
    check: vi.fn().mockResolvedValue({ status: 'confirmed', signature: 'known-signature', message: 'Confirmed' }),
  };
  return { candidate, ports, coordinator: createTransferCoordinator(ports), order };
}
describe('approval and send safety', () => {
  it('rejects invalid amounts before accessing the network', async () => {
    const { coordinator, ports } = fixture();
    for (const input of ['5', 'everything', '0', '-1', '0.0000000001']) await expect(coordinator.prepare('mum', input)).rejects.toThrow();
    expect(ports.prepare).not.toHaveBeenCalled();
  });
  it('constructs an immutable deterministic readback with exact values', async () => {
    const { coordinator } = fixture(); const p = await coordinator.prepare('mum', '0.2');
    expect(Object.isFrozen(p)).toBe(true); expect(p.readbackText).toContain('Send 0.2 SOL to Mum');
    expect(p.readbackText).toContain('0.000005 SOL'); expect(p.readbackText).toContain('0.799995 SOL'); expect(p).not.toHaveProperty('message');
  });
  it('refuses synthetic approval and cancellation never signs', async () => {
    const { coordinator, ports } = fixture(); const p = await coordinator.prepare('mum', '0.2');
    await expect(coordinator.confirm(p.id, { isTrusted: false })).rejects.toThrow();
    coordinator.cancel(p.id); await expect(coordinator.confirm(p.id, { isTrusted: true })).rejects.toThrow();
    expect(ports.sign).not.toHaveBeenCalled(); expect(ports.broadcast).not.toHaveBeenCalled();
  });
  it('submits once under concurrent confirmation and saves signature before send', async () => {
    const { coordinator, ports, order } = fixture(); const p = await coordinator.prepare('mum', '0.2');
    const outcomes = await Promise.allSettled([coordinator.confirm(p.id, { isTrusted: true }), coordinator.confirm(p.id, { isTrusted: true })]);
    expect(outcomes.map(o => o.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(ports.broadcast).toHaveBeenCalledTimes(1); expect(order).toEqual(['reserve', 'sign', 'save', 'broadcast']);
  });
  it('allows a new blockhash lifetime without changing approved terms', async () => {
    const { coordinator, ports, candidate } = fixture(); const p = await coordinator.prepare('mum', '0.2');
    vi.mocked(ports.prepare).mockResolvedValue({ ...candidate, lastValidBlockHeight: 1000n, message: { freshBlockhash: true } });
    expect((await coordinator.confirm(p.id, { isTrusted: true })).status).toBe('confirmed');
  });
  it.each(['recipient', 'sender', 'instructionsBytes', 'contactName', 'verifiedAt', 'fee', 'balanceAfter'] as const)('refuses changed %s before signing', async field => {
    const { coordinator, ports, candidate } = fixture(); const p = await coordinator.prepare('mum', '0.2');
    vi.mocked(ports.prepare).mockResolvedValue({ ...candidate, [field]: typeof candidate[field] === 'bigint' ? 99n : 'changed' });
    await expect(coordinator.confirm(p.id, { isTrusted: true })).rejects.toThrow('changed'); expect(ports.sign).not.toHaveBeenCalled();
  });
  it('refuses when refreshed simulation fails', async () => {
    const { coordinator, ports } = fixture(); const p = await coordinator.prepare('mum', '0.2');
    vi.mocked(ports.prepare).mockRejectedValue(new Error('Simulation failed'));
    await expect(coordinator.confirm(p.id, { isTrusted: true })).rejects.toThrow('Simulation'); expect(ports.sign).not.toHaveBeenCalled();
  });
  it('retains the locally known signature after ambiguous send and never auto-retries', async () => {
    const { coordinator, ports } = fixture(); const p = await coordinator.prepare('mum', '0.2');
    vi.mocked(ports.broadcast).mockRejectedValue(new Error('timeout')); vi.mocked(ports.check).mockRejectedValue(new Error('offline'));
    expect(await coordinator.confirm(p.id, { isTrusted: true })).toMatchObject({ status: 'pending', signature: 'known-signature' });
    expect(ports.broadcast).toHaveBeenCalledTimes(1); expect(ports.failBeforeBroadcast).not.toHaveBeenCalled();
  });
  it('reports a definite send rejection in plain words and never retries', async () => {
    const { coordinator, ports } = fixture(); const p = await coordinator.prepare('mum', '0.2');
    vi.mocked(ports.broadcast).mockRejectedValue(new Error('Rejected before processing. No SOL left your wallet.'));
    vi.mocked(ports.check).mockResolvedValue({ status: 'failed', signature: 'known-signature', message: 'generic' });
    expect(await coordinator.confirm(p.id, { isTrusted: true })).toMatchObject({ status: 'failed', message: 'Rejected before processing. No SOL left your wallet.' });
    expect(ports.broadcast).toHaveBeenCalledTimes(1);
  });
  it('blocks broadcast if persistence fails', async () => {
    const { coordinator, ports } = fixture(); const p = await coordinator.prepare('mum', '0.2');
    vi.mocked(ports.saveSigned).mockRejectedValue(new Error('disk full'));
    await expect(coordinator.confirm(p.id, { isTrusted: true })).rejects.toThrow('disk'); expect(ports.broadcast).not.toHaveBeenCalled();
  });
});
