import { describe, expect, it } from 'vitest';
import { checkDailyLimit, parseAmount } from './policy';
describe('deterministic payment amounts and limits', () => {
  it('parses exact lamports', () => { expect(parseAmount('0.000000001')).toBe(1n); expect(parseAmount('0.5')).toBe(500_000_000n); expect(parseAmount('0.100000001')).toBe(100_000_001n); });
  it('rejects ambiguous, non-positive, overprecision and oversized amounts', () => {
    for (const text of ['0', '-1', 'NaN', 'Infinity', '.1', '01', '1e-3', ' 0.1', '0.1 ', '0.0000000001', '0.500000001', '18446744073709551615', '1,000']) expect(() => parseAmount(text)).toThrow();
  });
  it('enforces daily limits with exact integers', () => { expect(() => checkDailyLimit(1_500_000_000n, 500_000_000n)).not.toThrow(); expect(() => checkDailyLimit(1_500_000_001n, 500_000_000n)).toThrow(); expect(() => checkDailyLimit(-1n, 1n)).toThrow(); });
});
