import { describe, expect, it, vi } from 'vitest';
import { handleDevnet } from './devnet';

function request(method = 'getGenesisHash', params: unknown = []) {
  return new Request('https://readback.example/api/devnet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 'test-1', method, params }) });
}
describe('strict Devnet relay', () => {
  it('uses only the fixed official Devnet endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ jsonrpc: '2.0', id: 'test-1', result: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG' }));
    const response = await handleDevnet(request(), fetcher);
    expect(response.status).toBe(200);
    expect(fetcher.mock.calls[0][0]).toBe('https://api.devnet.solana.com');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('rejects funding and arbitrary RPC methods', async () => {
    const fetcher = vi.fn();
    for (const method of ['requestAirdrop', 'getProgramAccounts', '__proto__']) {
      expect((await handleDevnet(request(method), fetcher)).status).toBe(403);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('requires preflight and zero RPC retries on broadcast, and two accounts in simulation', async () => {
    const fetcher = vi.fn();
    expect((await handleDevnet(request('sendTransaction', ['AAAA', { encoding: 'base64', skipPreflight: true, preflightCommitment: 'confirmed', maxRetries: 0 }]), fetcher)).status).toBe(400);
    expect((await handleDevnet(request('simulateTransaction', ['AAAA', { encoding: 'base64', sigVerify: false, replaceRecentBlockhash: false, commitment: 'confirmed', accounts: { addresses: [], encoding: 'base64' } }]), fetcher)).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects malformed addresses and incorrect commitments', async () => {
    const fetcher = vi.fn();
    expect((await handleDevnet(request('getBalance', ['not-an-address', { commitment: 'confirmed' }]), fetcher)).status).toBe(400);
    expect((await handleDevnet(request('getBalance', ['11111111111111111111111111111111', { commitment: 'processed' }]), fetcher)).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('preserves raw integer bytes for lossless SDK parsing', async () => {
    const raw = '{"jsonrpc":"2.0","id":"test-1","result":{"context":{"slot":123},"value":18446744073709551615}}';
    const fetcher = vi.fn().mockResolvedValue(new Response(raw));
    const response = await handleDevnet(request('getBalance', ['11111111111111111111111111111111', { commitment: 'confirmed' }]), fetcher);
    expect(await response.text()).toBe(raw);
  });
  it('returns an unavailable status on upstream failure', async () => {
    expect((await handleDevnet(request(), vi.fn().mockRejectedValue(new Error('network')))).status).toBe(503);
    expect((await handleDevnet(request(), vi.fn().mockResolvedValue(new Response(null, { status: 429 })))).status).toBe(503);
  });
});
