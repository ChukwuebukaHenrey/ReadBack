import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { readLedger, reservePayment, spentToday, updatePayment, type LedgerEntry } from './ledger';
describe('durable payment reservations', () => {
  it('atomically caps simultaneous reservations and counts only this sender and day', async () => {
    const sender = crypto.randomUUID();
    const entry = (): LedgerEntry => ({ id: crypto.randomUUID(), sender, recipient: 'recipient', name: 'Mum', amount: '500000000', day: '2026-11-07', createdAt: '2026-11-07T12:00:00.000Z', status: 'reserved' });
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => reservePayment(entry())));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(4);
    const records = await readLedger();
    expect(spentToday(records, sender, '2026-11-07')).toBe(2_000_000_000n);
    expect(spentToday(records, 'other', '2026-11-07')).toBe(0n);
    expect(spentToday(records, sender, '2026-11-08')).toBe(0n);
    const saved = records.find(r => r.sender === sender)!;
    await updatePayment(saved.id, 'confirmed', 'known-signature');
    expect(spentToday(await readLedger(), sender, '2026-11-07')).toBe(2_000_000_000n);
    await updatePayment(saved.id, 'failed');
    expect(spentToday(await readLedger(), sender, '2026-11-07')).toBe(1_500_000_000n);
  });
});
