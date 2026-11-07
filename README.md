# Readback

An accessibility-first Solana Devnet gateway, built with React, TypeScript and Vite. AI interprets requests; deterministic code checks supported actions; the person stays in control.

[Open Readback](https://readback-two.vercel.app) · [Workspace](https://readback-two.vercel.app/#app)

## Available now

- A browser-local disposable Devnet wallet with non-extractable Ed25519 keys stored in IndexedDB, real balance reads, address copy and faucet links.
- Saved contacts with complete-address review, independent verification, a last-four check, duplicate protection, rename and removal.
- Keyboard and screen-reader-oriented navigation: Where am I, What can I do, Go back and Repeat. Repeat only repeats text.
- Plain-language Web3 learning and an optional server-side Groq interpreter. Direct navigation works without AI.
- The supplied portrait design: orange hero, centered person, oversized Readback lettering behind the portrait, dark mission and feature sections. All meaningful content is real HTML.

Payments, transaction history and voice input are still being implemented. No transfer has been verified. No balances, confirmations or accessibility statistics are fabricated. This prototype is Devnet-only and has no wallet recovery; never use real funds.

## Develop

Use Node 22.12+ and npm. Windows PowerShell users can use `npm.cmd`.

```sh
npm install
npm run dev
npm run check
```

The landing page is at `/`; the workspace is at `/#app`. Vite development adapters serve both `/api/intent` and the restricted read-only `/api/devnet` relay. Vercel serves the corresponding Node functions.

Copy `.env.example` to `.env.local`. Set `GROQ_API_KEY` server-side, never in a `VITE_` variable. Set Production and Preview values separately in Vercel. The interpreter receives only the typed request after explicit opt-in. Its strict schema contains navigation actions and learning topics, never addresses, keys, balances, fees or signing instructions. Distributed API abuse limits remain future work.

## Accessibility and verification

Semantic landmarks, native controls, visible focus, heading focus after navigation, status announcements and reduced-motion handling are implemented. Workspace supporting copy and controls use a minimum 14px type size.

The portrait page has been exercised in headless Edge at 320, 390, 768, 1024 and 1440px with no horizontal content overflow. Link and disclosure targets are at least 44px high. Keyboard skip/disclosure controls and 200%-equivalent viewport reflow passed. Axe reported zero violations for its WCAG A/AA rules, with gradient contrast flagged for additional review. These checks are not WCAG certification or disabled-user validation. Manual NVDA/TalkBack and actual browser-zoom testing remain pending.

GitHub main deploys through Vercel, whose build runs ESLint, Vitest and TypeScript before bundling. The current local environment cannot download missing Solana packages, so full integration builds run on Vercel; local focused tests and lint are also used.

Read `AGENTS.md`, `codex.md`, `DESIGN_SPEC.md` and the supplied research brief for the project constraints. Mainnet, swaps, staking, production custody and Inngest are outside this MVP.
