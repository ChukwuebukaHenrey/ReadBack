import { describe, expect, it } from 'vitest';
import { formatSol } from './amount';
describe('exact balance formatting', () => {
  it('keeps lamport precision without floating point conversion', () => {
    expect(formatSol(0n)).toBe('0');
    expect(formatSol(1n)).toBe('0.000000001');
    expect(formatSol(1_000_000_001n)).toBe('1.000000001');
    expect(formatSol(500_000_000n)).toBe('0.5');
    expect(formatSol(18_446_744_073_709_551_615n)).toBe('18446744073.709551615');
  });
  it('rejects a negative network balance', () => { expect(() => formatSol(-1n)).toThrow(); });
});
