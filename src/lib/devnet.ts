import { createSolanaRpc } from '@solana/kit';
import { GENESIS_HASH } from '../features/wallet/service';

/** Devnet RPC through the restricted same-origin relay. Never another network. */
export function devnetRpc() {
  const configured = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  if (configured.replace(/\/$/, '') !== 'https://api.devnet.solana.com') throw new Error('Only Solana Devnet is allowed. Nothing was sent.');
  return createSolanaRpc(new URL('/api/devnet', window.location.origin).href);
}
export async function verifiedDevnetRpc() {
  const client = devnetRpc();
  const hash = await client.getGenesisHash().send({ abortSignal: AbortSignal.timeout(12000) });
  if (hash !== GENESIS_HASH) throw new Error('Network verification failed. This is not Solana Devnet. Nothing was signed.');
  return client;
}
