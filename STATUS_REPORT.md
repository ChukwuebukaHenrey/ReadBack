# Readback status — 7 November 2026 (updated)

Read against `docs/READBACK_BUILD_SPEC.md`, `docs/codex.md` and `docs/DESIGN_SPEC.md`, with fresh local checks. Supersedes the earlier audit in this file, which predated the transfer implementation and the dependency install.

## Fresh checks

- `npm run lint`: pass. `tsc --noEmit`: pass. `vite build`: pass.
- `vitest run`: 67 tests pass across 15 suites (including contact validation, instruction decoding, address poisoning, incoming detection, explanations and the transfer coordinator).
- `playwright test e2e/payments.spec.ts`: 15 pass in headless Edge. These use a **mocked** Devnet relay; they prove UI/guard behaviour, not live settlement.
- Live Devnet transfer: **not yet verified.** `e2e/live-devnet.spec.ts` (opt-in, `LIVE_DEVNET=1`) drives the real UI against real Devnet. The public RPC refuses airdrops (HTTP 410), so the test wallet must be funded by a person at https://faucet.solana.com. See BLOCKED_ON_USER.md.

## P0 status (build spec §2)

| Item | Status |
| --- | --- |
| Send SOL flow (G1–G13) | Implemented: form + assistant prefill → amount/cap checks → build → decode allowlist → fee → simulation → deterministic readback → `<dialog>` review → trusted-click confirm → fresh blockhash recheck → sign → signature persisted before send → one-shot broadcast → polled confirmation. |
| AI slot-filling | Implemented (Groq, strict Zod schema, missing-slot flags only, max 3 follow-ups). |
| AI refusal explanations + number guard (G16) | Implemented. |
| Three refusals (unknown contact, over cap, injection) | Implemented, browser-tested. |
| Rule-based fallback parser | Implemented. |
| Capability registry drives "What can I do?" | Implemented; includes contacts and send. |
| Stale copy removed | Done. |
| Activity view | Implemented, with Explorer links and explicit same-bytes resend. |

## Fixed in this pass

1. **Confirmation polling.** Previously one immediate status read after broadcast, which on real Devnet nearly always reported "pending". Now polls the same signature up to ~30 s; never rebroadcasts automatically.
2. **Stuck-payment lockout.** Unresolved payments block new ones, but nothing resolved them. Now: an unseen signature past `lastValidBlockHeight` is marked failed (it can never land); a first-send preflight rejection is marked failed; never-signed reservations older than 2 minutes are released.
3. **Header wallet** short address + Copy (spec §4.1).
4. **Settings view** (spec §4.8): app speech off by default with rate and test, keyboard notes (no global shortcuts, per DESIGN_SPEC §5), reset demo wallet behind a focused confirmation dialog, blocked while a payment is unresolved.

## P1 status (build spec §2)

| Item | Status |
| --- | --- |
| Address-poisoning check | Implemented: compares against saved contacts and the wallet's last 20 counterparties; flags same first/last four with a different middle, program accounts, no history, or an unavailable check. Flagged addresses need a second explicit confirmation. Browser-tested. |
| Live incoming announcements | Implemented over `wss://api.devnet.solana.com` account notifications; sender from balance changes only, named if a saved contact, else "unknown address ending ABCD". Memos never read. Subscription verified live; no real incoming payment observed yet. |
| On-chain consent receipt | Implemented: Memo `readback:v1:<sha256 of the consent statement>` on every transfer, pinned to the immutable SPL Memo program `MemoSq4g…` (the package default `Memo4c2p…` is upgradeable). Validator allows exactly transfer + receipt. A real Devnet simulation of transfer + receipt passed (fee 5,000 lamports, exact balance after). |
| Explain last transaction | Implemented: fixed template from ledger + on-chain fee; optional AI narration gets facts only (no names or addresses) and is number-checked (G16). Activity button and typed "explain last payment". |

## Remaining

- One real confirmed Devnet transfer (blocked on faucet funding).
- Manual NVDA/TalkBack pass and real 200% browser zoom.
- Deploy the tested build and verify production; update README with the live signature; demo video.
- No git remote is configured; commits are local only.

## Known limits

Devnet only. Browser-local, non-extractable key with no backup. Caps are enforced in the app, not on-chain. Not audited. Not tested with blind users.
