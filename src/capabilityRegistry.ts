export const capabilityRegistry = {
  balance: { label: 'Check your live Devnet balance', available: true },
  send: { label: 'Prepare a test SOL payment to a verified saved contact', available: true },
  list_contacts: { label: 'Add, review or remove saved contacts', available: true },
  activity: { label: 'Check payment status and confirmed activity', available: true },
  learn_web3: { label: 'Learn about Solana, fees and wallet safety', available: true },
  what_can_i_do: { label: 'Hear available actions', available: true },
  where_am_i: { label: 'Find out where you are', available: true },
  repeat: { label: 'Repeat the last announcement', available: true },
  help: { label: 'Get help with a request', available: true },
  go_back: { label: 'Go back without authorizing a payment', available: true },
  explain_last: { label: 'Explain your last payment in plain words', available: true },
  unsupported: { label: 'Unsupported request', available: false },
} as const;
export type CapabilityId = keyof typeof capabilityRegistry;
export const capabilityIds = Object.keys(capabilityRegistry) as [CapabilityId, ...CapabilityId[]];
export function availableActionsText() {
  return Object.values(capabilityRegistry).filter(c => c.available).map(c => c.label).join('. ') + '. Payments require a separate review and your explicit confirmation. Devnet only.';
}
