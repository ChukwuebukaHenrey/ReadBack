import { z } from 'zod';

export const requestSchema = z.object({ text: z.string().trim().min(1).max(500) }).strict();
// AI can select a destination page or a vetted topic; it cannot provide transaction data.
export const intentSchema = z.object({
  action: z.enum(['get_balance', 'list_contacts', 'prepare_sol_transfer', 'get_transaction_summary', 'learn_web3', 'where_am_i', 'what_can_i_do', 'go_back', 'repeat', 'unsupported']),
  topic: z.enum(['solana', 'fees', 'safety', 'staking', 'swaps']).nullable(),
}).strict();
export type Intent = z.infer<typeof intentSchema>;

export async function interpretRequest(text: string, signal: AbortSignal): Promise<Intent> {
  const response = await fetch('/api/intent', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestSchema.parse({ text })), signal,
  });
  if (!response.ok) throw new Error('Assistant unavailable. Use the navigation buttons or local commands.');
  return intentSchema.parse(await response.json());
}
