# Readback — Codex Engineering & Integration Brief

**Version:** 1.0 — 2026-11-06  
**Design contract:** Read `DESIGN_SPEC.md` before implementing UI.  
**Agent entrypoint:** `AGENTS.md` tells Codex to load this file. `codex.md` by itself is **not automatically discovered** by Codex CLI.

## Objective

Build a *real, usable* accessibility-first Web3 gateway for the MLH Solana hackathon. It must help users navigate supported capabilities without sight, understand real on-chain information, and authorize one safe Solana Devnet transfer. Favor working flows, screen-reader compatibility and auditability over visual polish or speculative features.

User is the sole human builder; Codex performs repository setup, installation, coding, tests, debugging and deployment preparation. User handles accounts, secrets, OAuth and external authorizations when asked. **Do not ask the user to copy/paste boilerplate or manually wire integrations that Codex can implement.**

## Work protocol

1. Inspect repository before editing. Respect existing files and avoid destructive rewrites or force pushes.
2. Load `DESIGN_SPEC.md`, this document and relevant official Solana docs/installed skill. Record ambiguities as short notes, then make safe defaults.
3. Work milestone-by-milestone. Implement, run typecheck/build/tests, and summarize actual evidence. No unsupported claims of successful execution.
4. Automatically install required dependencies and create configuration templates; ask user only for accounts, keys, service authorization, Devnet faucet or decisions with irreversible consequences.
5. Never print, commit, log, send to chat or put in frontend bundles any keys, mnemonic phrases, or confidential env contents. Do not embed fake secret values. All secrets should be `.env.local` + hosting provider environment settings.
6. If the user is away and authorization blocks a task, leave a precise `BLOCKED_ON_USER.md` entry stating the exact service and UI action needed; continue independent tasks.
7. Do not pretend an external integration works unless you have validated a real call. Clearly distinguish code written, tests passed, and user/browser actions pending.
8. When feature scope competes with safety, reduce scope. Never weaken signing checks to save time.

## Tech decisions (do not replace without reason)

| Layer | Default | Reason |
|---|---|---|
| Frontend | Vite + React + TypeScript (strict) | Small, interactive SPA |
| Styling | Semantic HTML + CSS Modules/plain CSS + CSS vars | Lowest accessibility complexity |
| Solana | `@solana/kit` + `@solana/kit-plugin-rpc` + `@solana/kit-plugin-signer` + `@solana-program/system` | Official plugin-based SDK for RPC/signing/transfers |
| Network | Devnet ONLY, public RPC initially | Test funds only |
| Wallet | Disposable browser-local Devnet signer (WebCrypto/IndexedDB when supported) | No production custody in MVP |
| Schema validation | `zod` | Validate data at each boundary |
| AI | GroqCloud through a **server-side Vercel Function** (`/api/intent` or equivalent) | No client-side API secret |
| Model | `openai/gpt-oss-20b` initially (configurable) | Constrained intent parsing / limited explanations |
| Input | Typed commands required; Web Speech API optionally | Voice is unreliable/not universal |
| Navigation | React `useReducer`, pure state-transition helpers, typed capability registry | Navigation must work without LLM |
| Persistence | IndexedDB for disposable wallet/contact records; non-sensitive task drafts optional | No cloud account required |
| Deployment | GitHub → Vercel | Fast reproducible review URL |
| Quality | TypeScript strict, ESLint, Vitest, Playwright, axe-core, manual NVDA | Accessible and testable flows |
| Background jobs | None for MVP. Inngest later only for non-signing jobs if needed | Minimize dependencies |

**No Next.js/VitePress**, n8n, MCP server, Anchor, smart-contract program, paid market-data API or broad autonomous agent framework in this scope. Do not add wallet-adapter or production wallet auth unless the user explicitly expands scope.

### Current SDK guidance

Consult official docs and installed Solana skill before coding because Kit package APIs evolve:

- https://solana.com/docs/frontend/client
- https://solana.com/docs/clients/official/javascript
- https://solana.com/docs/rpc/http/simulatetransaction
- https://solana.com/docs/rpc/http/getFeeForMessage
- https://github.com/solana-foundation/solana-dev-skill

Current documented client pattern includes `createClient().use(signer(payer)).use(solanaDevnetRpc())` from Kit + plugins; confirm exact compatible versions, transaction program calls and browser WebCrypto before implementation. Do **not** silently mix legacy `@solana/web3.js` v1 examples with Kit.

## Configuration contract

Generate `.env.example` with names, example URLs and *blank* secret values. Create `.gitignore` protecting `.env`, `.env.local`, `.env.*.local` and any keypair/credential files. Keep `.env.example` committable.

```dotenv
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
```

- `VITE_SOLANA_RPC_URL` is public and may appear in browser bundle.
- `GROQ_API_KEY` must only be accessed from the serverless function; never `VITE_GROQ_API_KEY`.
- Model name configured server-side; validate model availability and limits before relying on it.
- Never put an n8n webhook, Inngest signing key or privileged service secret in browser code. Inngest is not necessary at first.
- For local development, ensure the API route actually runs (Vite dev server alone does not automatically serve Vercel functions). Prefer documented `vercel dev` or an explicitly configured proxy/adapter; verify both UI and API locally. No dead `/api/intent` endpoint.
- In production, configure secrets through Vercel project settings. Agent must stop and ask user for authorization; do not fabricate credentials.

## Proposed directory structure

Keep it small; adapt to existing repo.

```text
readback/
├─ AGENTS.md
├─ codex.md
├─ DESIGN_SPEC.md
├─ .env.example
├─ api/
│  └─ intent.ts                 # backend, GROQ_API_KEY only here
├─ src/
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ contextReducer.ts      # deterministic task state
│  │  └─ capabilityRegistry.ts  # defined, permitted actions
│  ├─ components/
│  │  ├─ AppShell.tsx
│  │  ├─ AnnouncementRegion.tsx
│  │  ├─ RequestInput.tsx
│  │  └─ ReviewPaymentDialog.tsx
│  ├─ features/
│  │  ├─ wallet/               # demo signer lifecycle, balance
│  │  ├─ contacts/             # verified saved contacts
│  │  ├─ transfers/            # guard, plan, simulate, approve, send
│  │  ├─ activity/             # real history / explanation
│  │  └─ learn/                # read-only Web3 concepts
│  ├─ lib/
│  │  ├─ solana/               # RPC wrappers / Kit integration
│  │  ├─ ai/                   # typed API client and intent validation
│  │  ├─ speech/               # progressive enhancement only
│  │  └─ storage/              # IndexedDB adapters
│  ├─ styles/
│  └─ tests/
└─ README.md
```

## Capability registry and navigation (no AI dependency)

Explicit capability names, descriptions, permissions and availability status (read/write/learn-only), e.g.:

```ts
type CapabilityId =
  | 'where_am_i' | 'what_can_i_do' | 'repeat' | 'go_back'
  | 'get_balance' | 'list_contacts' | 'prepare_sol_transfer'
  | 'get_transaction_summary' | 'learn_web3';

type InteractionContext = {
  currentView: 'home' | 'wallet' | 'contacts' | 'transfer' | 'activity' | 'learn';
  activeTask: 'none' | 'check_balance' | 'send_sol' | 'learn_web3' | 'review_activity';
  step: string;
  availableActions: CapabilityId[];
  lastAnnouncement?: string;
  pendingProposalId?: string;
};
```

Implement a *deterministic reducer* for all navigation commands. `Repeat` must never rerun prior action; `Go back` must never sign or broadcast; returning to a task cannot restore an approved proposal. `What can I do?` enumerates **actual enabled capabilities**. A direct UI path bypasses AI entirely.

## AI contract

Use AI only for: (a) mapping natural-language requests onto enumerated capabilities; (b) explaining Web3 concepts from a limited, vetted knowledge corpus; (c) phrasing validated transaction facts when appropriate **without changing values**. No autonomous execution.

One indicative input/output schema for intent recognition:

```ts
type Intent =
  | { action: 'get_balance' }
  | { action: 'where_am_i' | 'what_can_i_do' | 'go_back' | 'repeat' }
  | { action: 'send_sol'; contact_name: string; amount_text: string; token: 'SOL' }
  | { action: 'explain_transaction'; transaction_id?: string }
  | { action: 'learn_web3'; topic: string }
  | { action: 'unsupported'; reason: string };
```

- Backend only accepts minimal necessary input; schema-validate model output with Zod again on the server and client.
- Model cannot supply raw destination addresses, wallet keys, signing instructions, balances, fees, private data or authority to send.
- If malformed/ambiguous, ask user to clarify; no speculative "best guess" for financial actions.
- Treat on-chain content and user free text as data; enforce all permissions in deterministic code.
- Graceful AI timeout/quota failure: direct buttons and local navigation still work.

## Wallet and transaction security invariants

**All constraints below are mandatory.**

1. **Devnet only.** Never configure mainnet fallback; show prominent test-only warning. Never use real funds or a production keypair.
2. **Disposable demo custody.** Generate/load a browser-local signer using supported WebCrypto facilities. Persist CryptoKeyPair in IndexedDB only after verifying browser support. Do not export raw secrets or store mnemonics in localStorage. If persistence is unavailable, explain the limitation; do not fake persistence or quietly replace a wallet. Treat injected JavaScript/XSS as a signing threat even for non-extractable keys.
3. **Saved-recipient only.** Paste and separately verify new addresses before saving; no spoken/raw LLM-defined destination addresses.
4. **Exact amount parsing.** Parse decimal string to `bigint` lamports; reject precision > 9 decimals, zero/negative/NaN/overflow; no JavaScript floating-point monetary arithmetic.
5. **Limits.** Example 0.5 SOL/transaction and 2 SOL/day; deterministic cap prior to proposal/simulation. Demo caps are policy guardrails, not proven security limits or on-chain enforcement.
6. **Transaction construction.** Build only a single native System Program SOL transfer to exactly one verified saved contact with known sender/fee payer. Decode/check the built instructions, programs and accounts. No arbitrary additional instructions, CPI or token swaps.
7. **Network check.** Retrieve real balance, fee estimate (`getFeeForMessage` or documented equivalent) and simulate candidate transaction. Require successful validation; classify errors clearly. Simulation is not an execution guarantee.
8. **Approval payload.** Bind immutable proposal ID to sender, recipient, lamports, Devnet, program/instruction bytes, fee payer, user-visible warnings and maximum acceptable fee. Review values are constructed from authoritative code/network state, NEVER generated by the LLM.
9. **Approve on trusted UI.** Accessible named control activated by an explicit gesture/keyboard; microphone paused throughout review. No voice-only confirmation. Focus starts on review heading, not Confirm; allow Repeat/Cancel; don't pressure users with a consent timer.
10. **Fresh blockhash.** On confirm, recompile with valid blockhash, re-validate exact intended instruction bytes and fee bounds, re-simulate, sign only if approved terms still match. Reapprove if material terms change or simulation becomes unsafe.
11. **Single submission.** Atomic one-shot state: pending → submitted → confirmed/failed. Guard double click and race conditions. Never automatically retry financial transaction broadcasting, and never claim confirmation based only on RPC send success.
12. **Signer isolation.** Never call signing from Groq, Inngest, MCP or a server-side AI tool. Do not pass the signing key to backend. No unrestricted agent capability such as `sign_transaction`.
13. **No secret leakage.** No key material in React state logging, analytics, telemetry, network traces, code samples or Git.

## Accessible UX behavior

Follow `DESIGN_SPEC.md` fully. In particular:

- The app must be usable by typed input + native controls before implementing microphone support.
- App TTS off by default; screen readers handle speech via semantic text and deliberate live announcements.
- High contrast, visible focus, skip link, headings, no focus loss during transitions.
- Dialogs with named headings, correct focus restore, explicit cancel. Labels and data don't rely on icons or color.
- Failure messages must be announced; distinguish validation rejected, simulation failed, submitted, confirmation pending, confirmed and failed.
- Mobile-first at 320px and zoomed to 200% without core-flow overflow.
- Web Speech API is optional progressive enhancement; detect support and permissions; stop microphone when user enters review; typed fallback never disabled.

## Build milestones and definition of done

### M0 — Foundation & test harness

- Vite React TS scaffold or adapt existing repo; CSS tokens, `.env.example`, `.gitignore`, lint, tests and no broken imports.
- Implement a compact, accessible **Home** with real navigation; status region; skip link; labelled request input; keyboard support; Devnet badge.
- **Acceptance:** `npm run build` and lint/typecheck pass; no fake wallet values; keyboard can reach all controls.

### M1 — Contextual Web3 navigation

- Typed capability registry + reducer + `Where am I?`, `What can I do?`, `Go back`, `Repeat`; local non-sensitive task restoration if helpful.
- **Acceptance:** commands work with AI offline, repeated/back never execute an action, screen-reader focus is predictable.

### M2 — Live Devnet wallet

- Verify WebCrypto Ed25519/Kit in target browser; create/load a disposable signer; actual address, balance, correct network, faucet link, clear data-loss warning.
- **Acceptance:** same address across reloads where browser supports persistence; balance matches Devnet explorer after faucet; no key leaks.

### M3 — Contacts and transaction plan

- Contact CRUD + validation + independent verification; deterministic amount parsing/limits; plan a single System SOL transfer; fee/simulation; fixed readback.
- **Acceptance:** wrong address, unknown name, too large, insufficient funds, wrong network and simulation error rejected before approval.

### M4 — Accessible authorization & real transfer

- Review dialog + exact user-approved proposal + safely refreshed blockhash and rechecks; locally sign; submit once; verify confirmation and show explorer.
- **Acceptance:** one real Devnet transfer from keyboard-only flow; cancellation does not sign; duplicate approval cannot send twice; status labels truthful.

### M5 — AI, learning & optional voice

- Server API to Groq, parsed intents, educational Learn Web3, read-only activity summary, optional push-to-talk, fallback when no microphone or API quota.
- **Acceptance:** AI never introduces an address/transaction instruction; demo still usable when API unavailable; education never executes real stake/swap.

### M6 — Accessibility validation & shipping

- Manual NVDA pass; Android TalkBack if accessible; automated axe + Vitest/Playwright; security negatives; responsive checks; deploy to Vercel; README and concise video/demo.
- **Acceptance:** public deployed URL, test/devnet provenance, real transaction signature from live run, limitations documented, all claims evidence-backed.

**If time runs short, stop after M4 + essential accessibility testing; do not trade the secure live path for ornamental features.**

## Test expectations

- Unit tests: decimal→lamport conversion, cap checks, address validation, `useReducer` transitions, capability discovery, proposal invariants and instruction equivalence.
- Component tests: dialogs/focus, live-region messages, errors, disabled states, labels, repeat/back safety.
- Browser integration: no mouse, viewport 320px, zoom 200%, reduced motion, network outages, AI timeout and denial, repeated click, slow response, blockhash expiry.
- Devnet integration: **actual** balance read and one **actual** confirmed transfer; clearly mark tests skipped due to faucet or unavailable network.
- Manual: test with NVDA Chrome/Edge; optionally TalkBack Android. A developer's closed-eye test is not proof of usability for blind users.
- Never use mocked network values in UI without a visible "demo mock" label; mocks belong in tests.

## Integration/action ownership

| Integration | Codex performs | Human performs |
|---|---|---|
| GitHub | Local git setup, branches, commit workflow, code review | Connect account/approve repo creation or permissions when necessary |
| Solana | Install Kit, Devnet RPC, wallet logic, integration tests | If necessary visit faucet/solve its anti-abuse verification |
| Groq | Build serverless endpoint, validation, error handling | Create account and put `GROQ_API_KEY` into secret store |
| Vercel | Configure build, API route, deploy preview/prod | Authorize GitHub/Vercel, set secret env vars, approve domain/settings |
| Inngest | **Deferred**; assess only for real async background needs | Create account only if later needed |
| Screen readers | Add semantic accessibility and automated tests | Help with manual testing on actual assistive tech/devices |

## Finish/report format at every milestone

Use short, evidence-based status:

```text
Milestone: Mx
Implemented: ...
Files changed: ...
Validation: npm run build PASS / tests PASS / manual pending
Real integration tested: yes/no, with evidence (no secrets)
Blocked on user: exact account/auth action or none
Known limits/security risks: ...
Next milestone: ...
```

Do not claim to have deployed, verified live transfers or screen-reader-tested when these were not actually performed.

## First task to execute

> Read `AGENTS.md`, `codex.md`, `DESIGN_SPEC.md` and the installed Solana skill. Inspect the current repository, then implement **M0 and M1 only**. Make the app shell genuinely accessible and the navigation commands deterministic. Run build/tests, fix failures, and give me a short evidence-based report. Do not generate payments, create real accounts, fabricate product metrics, or wire AI before the basics work. Ask me only for authorization or a necessary missing secret.
