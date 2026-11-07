import { z } from 'zod';
const addr = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
const sig = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/);
const encoded = z.string().min(1).max(1644).regex(/^[A-Za-z0-9+/]+={0,2}$/);
const commitment = z.object({ commitment: z.literal('confirmed') }).strict();
export const methodParams = {
  getGenesisHash: z.tuple([]).optional(),
  getBalance: z.tuple([addr, commitment]),
  getLatestBlockhash: z.tuple([commitment]),
  getBlockHeight: z.tuple([commitment]),
  getFeeForMessage: z.tuple([encoded, commitment]),
  simulateTransaction: z.tuple([encoded, z.object({ encoding: z.literal('base64'), commitment: z.literal('confirmed'), sigVerify: z.literal(false), replaceRecentBlockhash: z.literal(false), accounts: z.object({ encoding: z.literal('base64'), addresses: z.array(addr).length(2) }).strict() }).strict()]),
  sendTransaction: z.tuple([encoded, z.object({ encoding: z.literal('base64'), skipPreflight: z.literal(false), preflightCommitment: z.literal('confirmed'), maxRetries: z.literal(0) }).strict()]),
  getSignatureStatuses: z.tuple([z.array(sig).min(1).max(20), z.object({ searchTransactionHistory: z.literal(true) }).strict()]),
  getSignaturesForAddress: z.tuple([addr, z.object({ commitment: z.literal('confirmed'), limit: z.number().int().min(1).max(100), before: sig.optional() }).strict()]),
  getTransaction: z.tuple([sig, z.object({ commitment: z.literal('confirmed'), encoding: z.literal('jsonParsed'), maxSupportedTransactionVersion: z.literal(0) }).strict()]),
  getAccountInfo: z.tuple([addr, z.object({ commitment: z.literal('confirmed'), encoding: z.literal('base64') }).strict()]),
} as const;
export const rpcSchema = z.object({ jsonrpc: z.literal('2.0'), id: z.union([z.string().max(100), z.number().int()]), method: z.string(), params: z.unknown().optional() }).strict();
