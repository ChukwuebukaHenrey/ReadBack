/** MVP labels use Latin script to refuse mixed-script lookalike names. */
export function normalizeName(value: string): string {
  if (/\p{C}/u.test(value)) throw new Error('Remove invisible or control characters from the contact name.');
  const name = value.normalize('NFKC').trim();
  if (!name || name.length > 40 || !/^[\p{Script=Latin}\p{M}\p{N} .'-]+$/u.test(name)) {
    throw new Error('Use a contact label of 1–40 Latin letters, numbers, spaces, apostrophes, dots or hyphens. Lookalike scripts are not supported in this demo.');
  }
  return name;
}
export function nameKey(value: string) { return normalizeName(value).toLocaleLowerCase('en-US'); }
