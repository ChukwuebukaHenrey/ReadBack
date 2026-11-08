import { describe, expect, it } from 'vitest';
import { findLookalikes, needsSecondConfirmation, riskWarnings } from './risk';

const real = '4AKNMLm1eQKdxNFUW26yJSmM6UuyKSkGYt5fvQMbDsup';
const poisoned = '4AKNzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzDsup';
describe('address poisoning check', () => {
  it('flags same first and last four with a different middle', () => {
    expect(findLookalikes(poisoned, [real, '11111111111111111111111111111112'])).toEqual([real]);
  });
  it('does not flag the identical address or unrelated ones', () => {
    expect(findLookalikes(real, [real])).toEqual([]);
    expect(findLookalikes(real, ['4AKNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'])).toEqual([]);
  });
  it('requires a second confirmation for lookalikes, programs and unchecked addresses only', () => {
    const base = { lookalikes: [], isProgram: false, offCurve: false, noHistory: false, unchecked: false };
    expect(needsSecondConfirmation(base)).toBe(false);
    expect(needsSecondConfirmation({ ...base, noHistory: true })).toBe(false);
    expect(needsSecondConfirmation({ ...base, lookalikes: [real] })).toBe(true);
    expect(needsSecondConfirmation({ ...base, isProgram: true })).toBe(true);
    expect(needsSecondConfirmation({ ...base, unchecked: true })).toBe(true);
    expect(needsSecondConfirmation({ ...base, offCurve: true })).toBe(true);
    expect(riskWarnings({ ...base, lookalikes: [real] })[0]).toContain('ending Dsup');
  });
});
