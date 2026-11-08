import { describe, expect, it } from 'vitest';
import { spellAddress, spellCharacters } from './spell';
describe('case-aware spelling', () => {
  it('distinguishes upper and lower case letters', () => {
    expect(spellCharacters('Dsup')).toBe('capital D, small s, small u, small p');
    expect(spellCharacters('MLm1')).toBe('capital M, capital L, small m, 1');
  });
  it('spells an address in numbered groups of four', () => {
    expect(spellAddress('4AKNMLm1')).toBe('Group 1: 4, capital A, capital K, capital N. Group 2: capital M, capital L, small m, 1.');
  });
});
