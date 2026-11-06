# Readback

An accessibility-first Solana Devnet gateway with keyboard and screen-reader navigation, clear transaction readbacks, and human-approved payments.

Built for a Solana hackathon using React, TypeScript and Vite. The interface uses the supplied Readback brand assets and provides deterministic navigation, plain-language learning and an optional server-side Groq intent interpreter. Wallet and payment milestones are being built; no balances or transactions are fabricated. AI cannot sign, approve or provide transaction data.

## Run

Use Node 22.12+ and npm. On Windows where PowerShell blocks npm.ps1, use `npm.cmd`.

```
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

Navigation works offline: type “Where am I?”, “What can I do?”, “Go back”, “Repeat”, “Check balance”, or “Explore Web3”. Direct buttons provide the same navigation without a language model. Repeat only repeats text; back only changes views. Unrecognized requests never authorize anything.

The landing page is at `/`; the workspace is at `/#app`. Semantic landmarks, visible focus, page-heading focus and persistent status announcements are implemented. Headless Edge checks passed for keyboard navigation/back/learning, heading focus, page titles, 320px reflow and 44px button targets. Manual NVDA, 200% zoom and axe checks remain pending; no WCAG conformance is claimed.

Copy `.env.example` to `.env.local` and configure `GROQ_API_KEY` there to enable optional AI interpretation. `npm run dev` serves both Vite and `/api/intent` through a local adapter; Vercel serves the same handler as a Node.js function. Production/preview keys belong in Vercel project environment settings. Secrets are never prefixed with `VITE_`. `.env.txt` is also ignored. Direct controls and local commands work without an AI key or network.

Groq receives only the submitted request after the user opts in. Server and client validate a strict action/topic schema. No keys, balances, contacts or transaction instructions are sent to the model. The API has input/output bounds, timeout and safe error handling. It is a hackathon prototype; distributed abuse limits are not yet implemented.

Validation: production build, TypeScript, ESLint and 13 Vitest tests passed using locally available packages; a clean registry install still needs verification. Live Groq access was blocked by the local environment's network policy. No live payment or deployment is claimed until verified.

Next: M2, browser-local disposable Ed25519 signer persistence and real Devnet balance. Read `AGENTS.md`, `codex.md`, and `DESIGN_SPEC.md` for the full contract. Inngest, mainnet, staking and swaps are outside this MVP.
