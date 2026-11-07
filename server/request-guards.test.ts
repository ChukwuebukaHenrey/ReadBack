import { describe, expect, it } from 'vitest';
import { createRateLimiter, limitedBody } from './request-guards';
describe('server resource guards', () => {
  it('limits each platform-provided IP and resets after the window', () => {
    const allow = createRateLimiter(2, 100);
    const a = new Request('https://readback.example', { headers: { 'x-vercel-forwarded-for': 'a' } });
    const b = new Request('https://readback.example', { headers: { 'x-vercel-forwarded-for': 'b' } });
    expect(allow(a, 0)).toBe(true); expect(allow(a, 1)).toBe(true); expect(allow(a, 2)).toBe(false);
    expect(allow(b, 2)).toBe(true); expect(allow(a, 101)).toBe(true);
  });
  it('bounds body bytes even without a content-length header', async () => {
    const request = new Request('https://readback.example', { method: 'POST', body: 'a'.repeat(100) });
    await expect(limitedBody(request, 10)).rejects.toThrow('body_limit');
  });
});
