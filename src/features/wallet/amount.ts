export function formatSol(lamports: bigint): string {
  if (lamports < 0n) throw new Error('Balance cannot be negative.');
  const whole = lamports / 1_000_000_000n;
  const fraction = (lamports % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
