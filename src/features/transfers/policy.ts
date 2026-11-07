export const MAX_TRANSFER = 500_000_000n;
export const DAILY_LIMIT = 2_000_000_000n;
export const MAX_FEE = 20_000n;
export function parseAmount(text: string): bigint {
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,9})?$/.test(text)) throw new Error('Enter a positive SOL amount with at most nine decimal places.');
  if (text.length > 30) throw new Error('Amount is too large.');
  const [whole, fraction = ''] = text.split('.');
  const value = BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9, '0'));
  if (value <= 0n || value > MAX_TRANSFER) throw new Error('Use an amount greater than zero and no more than 0.5 SOL.');
  return value;
}
export function checkDailyLimit(used: bigint, proposed: bigint) {
  if (used < 0n || proposed <= 0n || proposed > MAX_TRANSFER || used + proposed > DAILY_LIMIT) throw new Error('This payment exceeds the 0.5 SOL per-payment or 2 SOL per UTC-day demo limit.');
}
