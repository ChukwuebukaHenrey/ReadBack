# Blocked on user

1. **Fund the live-test wallet.** Visit https://faucet.solana.com, choose Devnet, and send at least 0.2 test SOL to the address printed by `LIVE_DEVNET=1 npx playwright test e2e/live-devnet.spec.ts` (persisted in `.live-devnet-profile/`). The public RPC airdrop returns HTTP 410, so this needs a human. Then rerun the same command to record a real confirmed transfer.
2. Manual NVDA/TalkBack testing still needs a person.
