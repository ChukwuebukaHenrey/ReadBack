import { z } from 'zod';

const rpcSchema = z.discriminatedUnion('method', [
  z.object({ jsonrpc: z.literal('2.0'), id: z.union([z.string().max(100), z.number().int()]), method: z.literal('getGenesisHash'), params: z.tuple([]).optional() }).strict(),
  z.object({ jsonrpc: z.literal('2.0'), id: z.union([z.string().max(100), z.number().int()]), method: z.literal('getBalance'), params: z.tuple([z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/), z.object({ commitment: z.literal('confirmed') }).strict()]) }).strict(),
]);

// Read-only, fixed-upstream relay. It cannot fund, sign, simulate or broadcast.
export async function handleDevnet(request: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { ...headers, Allow: 'POST' } });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403, headers });
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return Response.json({ error: 'Use a JSON request.' }, { status: 415, headers });
  let body: z.infer<typeof rpcSchema>;
  try {
    const text = await request.text();
    if (text.length > 2048) return Response.json({ error: 'Request is too long.' }, { status: 413, headers });
    body = rpcSchema.parse(JSON.parse(text));
  } catch { return Response.json({ error: 'Only Devnet network identity and confirmed balance reads are supported.' }, { status: 400, headers }); }
  try {
    const upstream = await fetcher('https://api.devnet.solana.com', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) return Response.json({ jsonrpc: '2.0', id: body.id, error: { code: -32000, message: 'Devnet RPC is unavailable. Try refreshing later.' } }, { status: 503, headers });
    // Preserve the raw JSON number bytes for Kit's lossless bigint decoder.
    return new Response(await upstream.text(), { headers: { ...headers, 'Content-Type': 'application/json' } });
  } catch { return Response.json({ jsonrpc: '2.0', id: body.id, error: { code: -32000, message: 'Devnet RPC could not be reached.' } }, { status: 503, headers }); }
}
