import { z } from 'zod';
export const refusalSchema = z.object({ reason: z.enum(['unknown_contact', 'amount', 'unsupported', 'unclear']), limit: z.literal('0.5') }).strict();
export type RefusalFact = z.infer<typeof refusalSchema>;
export function refusalTemplate(fact: RefusalFact) {
  switch (fact.reason) {
    case 'unknown_contact': return 'I only send to saved contacts. Add and independently verify the recipient first.';
    case 'amount': return 'Enter an exact positive SOL amount, up to 0.5 SOL per payment and at most nine decimal places. Nothing was sent.';
    case 'unsupported': return 'I cannot authorize payments from a request, send all funds, or execute swaps or staking. Choose a saved contact and an exact amount, then review the payment yourself.';
    case 'unclear': return 'I did not understand that. Use the Send SOL form or try “Send 0.1 SOL to Mum”.';
  }
}
export function checkedExplanation(text: string, fact: RefusalFact): string {
  const template = refusalTemplate(fact);
  const numbers = /-?\d+(?:\.\d+)?|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|half|quarter|hundred|thousand|million|billion)\b/gi;
  const allowed = new Set((JSON.stringify(fact) + ' ' + template).toLowerCase().match(numbers) ?? []);
  if (!text.trim() || text.length > 350 || /[<>]|https?:/i.test(text) || (text.toLowerCase().match(numbers) ?? []).some(n => !allowed.has(n))) return template;
  return text;
}
export async function explainRefusal(fact: RefusalFact, signal: AbortSignal) {
  const response = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fact), signal });
  if (!response.ok) return refusalTemplate(fact);
  const parsed = z.object({ explanation: z.string().max(350) }).strict().parse(await response.json());
  return checkedExplanation(parsed.explanation, fact);
}
