// Solana addresses are case-sensitive, and screen readers do not say letter case.
// Spell each character so "m" and "M" sound different.
export function spellCharacters(text: string): string {
  return Array.from(text, c => /[A-Z]/.test(c) ? `capital ${c}` : /[a-z]/.test(c) ? `small ${c}` : c).join(', ');
}
export function spellAddress(address: string): string {
  const groups = address.match(/.{1,4}/g) ?? [];
  return groups.map((group, i) => `Group ${i + 1}: ${spellCharacters(group)}.`).join(' ');
}
