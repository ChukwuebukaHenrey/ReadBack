export const topics = [
  { id: 'solana', title: 'What is Solana?', text: 'Solana is a blockchain: a shared record of transactions. This demo uses Devnet, a separate network for testing. Devnet SOL has no monetary value.' },
  { id: 'fees', title: 'Understanding network fees', text: 'Transactions require a network fee paid in SOL. A fee estimate and simulation must be checked before payment review. Simulation does not guarantee success.' },
  { id: 'safety', title: 'Looking after your wallet', text: 'A wallet authorizes transactions using a signing key. Never share a recovery phrase or use a production wallet for this demo. This disposable wallet has no recovery service.' },
  { id: 'staking', title: 'What does staking mean?', text: 'Staking delegates SOL to help secure a network and may earn rewards with risks. Learn only: Readback does not support staking transactions.' },
  { id: 'swaps', title: 'How do token swaps work?', text: 'A swap exchanges one token for another. Prices, fees and risks vary. Learn only: Readback does not support swaps or live price quotes.' },
] as const;
