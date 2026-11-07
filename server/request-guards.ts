// Best-effort per-instance limit. Hosting-wide protection must be configured separately.
export function createRateLimiter(limit: number, windowMs = 60_000) {
  const clients = new Map<string, { count: number; reset: number }>();
  return (request: Request, now = Date.now()): boolean => {
    const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || 'local';
    for (const [key, value] of clients) if (value.reset <= now) clients.delete(key);
    const old = clients.get(ip);
    if (!old) {
      if (clients.size >= 10_000) return false;
      clients.set(ip, { count: 1, reset: now + windowMs }); return true;
    }
    return ++old.count <= limit;
  };
}
export async function limitedBody(request: Request, limit: number): Promise<string> {
  if (Number(request.headers.get('content-length')) > limit) throw new Error('body_limit');
  const reader = request.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder(); let length = 0; let text = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw new Error('body_limit'); }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
