import { describe, expect, it, vi } from 'vitest';
import { handleIntent } from './intent';
import { intentSchema } from '../src/lib/intent';

function request(body: unknown = { text: 'Explain network fees' }, origin?: string) {
  return new Request('https://readback.example/api/intent', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify(body),
  });
}

describe('server-side intent boundary', () => {
  it('fails safely without a server key', async () => {
    const fetcher = vi.fn();
    const response = await handleIntent(request(), {}, fetcher);
    expect(response.status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects extra data and oversized requests before contacting Groq', async () => {
    const fetcher = vi.fn();
    for (const body of [{ text: 'hello', walletKey: 'do-not-send' }, { text: '' }, { text: 'x'.repeat(501) }]) {
      expect((await handleIntent(request(body), { GROQ_API_KEY: 'test-only' }, fetcher)).status).toBe(400);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('denies requests from a different origin', async () => {
    expect((await handleIntent(request(undefined, 'https://another.example'), {})).status).toBe(403);
  });
  it('accepts only a validated action and keeps the key server-side', async () => {
    const intent = { action: 'learn_web3', topic: 'fees' };
    const fetcher = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: JSON.stringify(intent) } }] }));
    const response = await handleIntent(request(), { GROQ_API_KEY: 'test-only' }, fetcher);
    expect(await response.json()).toEqual(intent);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const options = fetcher.mock.calls[0][1];
    expect(JSON.parse(options.body).response_format.json_schema.strict).toBe(true);
    expect(JSON.parse(options.body).messages[1]).toEqual({ role: 'user', content: 'Explain network fees' });
  });
  it('rejects model-invented transaction data and authorization', async () => {
    for (const intent of [{ action: 'sign_transaction', topic: null }, { action: 'prepare_sol_transfer', topic: null, recipient: 'invented' }, { action: 'get_balance', topic: null, balance: 100 }]) {
      const fetcher = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: JSON.stringify(intent) } }] }));
      expect((await handleIntent(request(), { GROQ_API_KEY: 'test-only' }, fetcher)).status).toBe(502);
      expect(intentSchema.safeParse(intent).success).toBe(false);
    }
  });
  it('handles rate limits and transport outages without leaking provider errors', async () => {
    const limited = vi.fn().mockResolvedValue(new Response('private upstream detail', { status: 429 }));
    const response = await handleIntent(request(), { GROQ_API_KEY: 'test-only' }, limited);
    expect(response.status).toBe(429);
    expect(await response.text()).not.toContain('private upstream');
    const unavailable = vi.fn().mockRejectedValue(new Error('private upstream detail'));
    expect((await handleIntent(request(), { GROQ_API_KEY: 'test-only' }, unavailable)).status).toBe(502);
  });
  it('rejects unsupported HTTP methods', async () => {
    const response = await handleIntent(new Request('https://readback.example/api/intent'), {});
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });
});
