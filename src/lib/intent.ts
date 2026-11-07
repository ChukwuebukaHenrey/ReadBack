import { z } from 'zod';
import { capabilityIds } from '../capabilityRegistry.js';

export const slotsSchema = z.object({ amountText: z.string().max(30).optional(), contactName: z.string().max(40).optional() }).strict();
export type Slots = z.infer<typeof slotsSchema>;
// Slot values stay local. Only missing-field flags are sent to the provider.
export const requestSchema = z.object({ text: z.string().trim().min(1).max(300), state: z.object({ awaitingAmount: z.boolean(), awaitingContact: z.boolean() }).strict().optional() }).strict();
export const intentSchema = z.object({
  action: z.enum(capabilityIds),
  amountText: z.string().max(30).regex(/^\d+(\.\d{1,9})?$/).nullish(),
  contactName: z.string().max(40).nullish(),
  question: z.string().max(120).nullish(),
  topic: z.enum(['solana', 'fees', 'safety', 'staking', 'swaps']).nullish(),
}).strict().refine(v => v.action === 'send' || (!v.amountText && !v.contactName && !v.question), 'Only a send intent can contain payment slots.');
export const modelIntentSchema = z.object({ action: z.enum(capabilityIds), amountText: z.string().nullable(), contactName: z.string().nullable(), question: z.string().nullable(), topic: z.enum(['solana', 'fees', 'safety', 'staking', 'swaps']).nullable() }).strict();
export type Intent = z.infer<typeof intentSchema>;

export async function interpretRequest(text: string, signal: AbortSignal, slots?: Slots): Promise<Intent> {
  const state = slots ? { awaitingAmount: !slots.amountText, awaitingContact: !slots.contactName } : undefined;
  const response = await fetch('/api/parse-intent', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestSchema.parse({ text, state })), signal,
  });
  if (!response.ok) throw new Error('Assistant unavailable. Use the navigation buttons or local commands.');
  return intentSchema.parse(await response.json());
}

export function fallbackIntent(input: string, slots?: Slots): Intent | null {
  const text = input.trim().replace(/[?!]+$/, '');
  if (/\b(ignore|override|bypass|confirm|approve|sign|everything|maximum|all funds)\b/i.test(text)) return { action: 'unsupported' };
  const send = /^send(?:\s+(\S+)\s+sol)?(?:\s+to\s+(.+))?$/i.exec(text);
  if (send) return { action: 'send', amountText: send[1], contactName: send[2] };
  if (slots && /^\d+(?:\.\d+)?(?:\s+sol)?$/i.test(text)) return { action: 'send', amountText: text.replace(/\s+sol$/i, '') };
  if (/^(?:balance|check balance|what(?:'s| is) my balance)$/i.test(text)) return { action: 'balance' };
  if (/^(?:contacts|list contacts|saved contacts)$/i.test(text)) return { action: 'list_contacts' };
  if (/^(?:activity|recent activity)$/i.test(text)) return { action: 'activity' };
  if (/^(?:explain(?: my)? last(?: payment| transaction)?|what did i (?:just )?send)$/i.test(text)) return { action: 'explain_last' };
  if (/^what can i do$/i.test(text)) return { action: 'what_can_i_do' };
  if (/^where am i$/i.test(text)) return { action: 'where_am_i' };
  if (/^repeat$/i.test(text)) return { action: 'repeat' };
  if (/^help$/i.test(text)) return { action: 'help' };
  if (/^(?:explore web3|learn)$/i.test(text)) return { action: 'learn_web3', topic: 'solana' };
  if (slots?.amountText && !slots.contactName && text.length <= 40) return { action: 'send', contactName: text };
  return null;
}
