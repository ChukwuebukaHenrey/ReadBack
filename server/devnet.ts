import { z } from 'zod';
import { methodParams, rpcSchema } from './rpc-schema.js';
import { createRateLimiter, limitedBody } from './request-guards.js';
const allow = createRateLimiter(180);

// Fixed Devnet upstream and strict method/parameter allowlist. It never signs.
export async function handleDevnet(request: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { ...headers, Allow: 'POST' } });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403, headers });
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return Response.json({ error: 'Use a JSON request.' }, { status: 415, headers });
  if (!allow(request)) return Response.json({ error: 'Too many requests. Wait a minute.' }, { status: 429, headers });
  let body: z.infer<typeof rpcSchema>;
  try {
    const text = await limitedBody(request, 8192);
    body = rpcSchema.parse(JSON.parse(text));
    if (!Object.hasOwn(methodParams, body.method)) return Response.json({ error: 'That RPC method is not allowed.' }, { status: 403, headers });
    methodParams[body.method as keyof typeof methodParams].parse(body.params);
  } catch (error) { return Response.json({ error: 'Invalid Devnet request.' }, { status: error instanceof Error && error.message === 'body_limit' ? 413 : 400, headers }); }
  try {
    const upstream = await fetcher('https://api.devnet.solana.com', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) return Response.json({ jsonrpc: '2.0', id: body.id, error: { code: -32000, message: 'Devnet RPC is unavailable. Try refreshing later.' } }, { status: 503, headers });
    // Preserve the raw JSON number bytes for Kit's lossless bigint decoder.
    return new Response(await upstream.text(), { headers: { ...headers, 'Content-Type': 'application/json' } });
  } catch { return Response.json({ jsonrpc: '2.0', id: body.id, error: { code: -32000, message: 'Devnet RPC could not be reached.' } }, { status: 503, headers }); }
}
