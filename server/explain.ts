import { z } from 'zod';
import { checkedExplanation, refusalSchema, refusalTemplate } from '../src/lib/refusals.js';
import { checkedTransactionExplanation, transactionFactSchema, transactionTemplate } from '../src/lib/explanations.js';
import { createRateLimiter, limitedBody } from './request-guards.js';
const allow = createRateLimiter(20);
export async function handleExplanation(request: Request, env: { GROQ_API_KEY?: string; GROQ_MODEL?: string }, fetcher: typeof fetch = fetch) {
  const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Origin refused.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Use JSON.' }, 415);
  if (!allow(request)) return json({ error: 'Too many requests.' }, 429);
  let fact: z.infer<typeof refusalSchema> | z.infer<typeof transactionFactSchema>;
  try { fact = z.union([refusalSchema, transactionFactSchema]).parse(JSON.parse(await limitedBody(request, 1024))); } catch { return json({ error: 'Invalid facts.' }, 400); }
  const isTx = 'kind' in fact;
  const fallback = 'kind' in fact ? transactionTemplate(fact) : refusalTemplate(fact);
  const check = (text: string) => 'kind' in fact ? checkedTransactionExplanation(text, fact) : checkedExplanation(text, fact);
  if (!env.GROQ_API_KEY) return json({ explanation: fallback });
  try {
    const result = await fetcher('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(8000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
      body: JSON.stringify({ model: env.GROQ_MODEL || 'openai/gpt-oss-20b', ...((env.GROQ_MODEL || 'openai/gpt-oss-20b').startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}), temperature: 0, max_completion_tokens: 512, messages: [
        { role: 'system', content: isTx ? 'Explain this Solana Devnet payment to a screen-reader user in at most two plain sentences. Use only the supplied facts and numbers exactly as written. Do not add numbers, addresses, names, advice to resend, or new facts. No markdown.' : 'Explain this refusal in at most two plain sentences. Use only supplied facts. Do not add numbers, claims of successful payments, addresses, instructions to sign, or facts. No markdown.' },
        { role: 'user', content: JSON.stringify({ ...fact, verifiedExplanation: fallback }) },
      ] }),
    });
    if (!result.ok) return json({ explanation: fallback });
    const parsed = z.object({ choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1) }).parse(await result.json());
    return json({ explanation: check(parsed.choices[0].message.content) });
  } catch { return json({ explanation: fallback }); }
}
