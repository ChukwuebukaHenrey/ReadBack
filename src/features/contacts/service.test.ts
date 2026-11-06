import { describe, expect, it } from 'vitest';
import { validateContact } from './service';
describe('saved recipient validation', () => {
  const valid = '11111111111111111111111111111111';
  it('normalizes names for duplicate checks without changing the destination', () => {
    expect(validateContact('  Mum  ', valid)).toMatchObject({ name: 'Mum', normalizedName: 'mum', address: valid });
  });
  it('rejects malformed addresses and hidden names', () => {
    for (const destination of ['', 'not-an-address', '0'.repeat(44), '1'.repeat(45)]) expect(() => validateContact('Mum', destination)).toThrow();
    for (const name of ['', ' '.repeat(4), 'a'.repeat(41), 'Mum\u200b']) expect(() => validateContact(name, valid)).toThrow();
  });
});
