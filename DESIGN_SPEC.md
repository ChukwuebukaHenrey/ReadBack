# Readback — Product & UI/UX Design Specification

**Status:** Hackathon implementation brief, v1.0  
**Date:** 2026-11-06  
**Target:** Accessible, responsive Solana Devnet web application  
**Companion:** `codex.md` (technical architecture, delivery plan), `AGENTS.md` (Codex entry point)

## 1. Product definition

**Readback is an accessibility-first gateway to Web3.** It lets people discover, understand, navigate, and safely use *supported* Solana capabilities via screen readers, keyboard, typed instructions, and optional voice. A disposable Devnet wallet is the vehicle for demonstrating the interaction model; the product is **not** positioned as only a voice wallet.

**Core principle:** The AI interprets; deterministic code verifies; the human authorizes. **Tasks, not screens**, while keeping conventional screen-reader navigation first-class.

### Audience and evidence limits

- Primary initial research scenario: blind / low-vision person using Android TalkBack or Windows NVDA; also consider VoiceOver, keyboard-only and switch access.
- Design for sighted users, Deaf/hard-of-hearing people, and motor impairments without assuming one method works for everyone.
- A screen-reader-first web interface is a hypothesis to be validated with real assistive-technology users. Never claim tested accessibility, WCAG conformance, security for real money, or category-first status without evidence.

## 2. Scope boundaries

### Must function in the hackathon MVP

1. Accessible app shell + capability discovery: **What can I do?**, **Where am I?**, **Go back**, **Repeat**.
2. A real disposable Devnet wallet with persistence across reloads when supported; display, copy and announce the public address; read live SOL balance.
3. Saved contacts: add, label, review and verify a pasted address; duplicate-name handling and validation.
4. SOL transfer to **saved contact only**, with deterministic input checks and a configurable demo cap.
5. Simulation/fee estimate; accessible, exact transaction readback; explicit human approval; guarded signing and network confirmation.
6. Read-only recent transaction summary and a small **Explore Web3** educational section, clearly marking unimplemented actions.
7. Typed request entry as the reliable baseline; optional push-to-talk voice input; optional app TTS **off by default**.
8. A responsive mobile-first visual interface **and** an end-to-end keyboard/screen-reader path.

### Explicit non-goals for this build

Mainnet, real money, production custody, swaps, staking execution, token trading, portfolio price feeds, external dApp control, multi-chain wallets, social login, full MCP server, smart glasses, Braille hardware integration, autonomous agents, agent-controlled signing, private-key export, and production recovery. Educational pages can discuss such topics only as clearly labeled **learn-only** content.

### Success scenario

Without sight, a user can open Readback, ask what is possible, check a **real** Devnet balance, resume a prior non-sensitive task, request a transfer to a verified saved contact, inspect recipient/amount/fee/network through their own screen reader, approve or cancel, and distinguish pending from confirmed transaction status. At least one unsafe request is refused.

## 3. Brand and visual direction

Based on the dark/editorial orange-and-black Readback exploration, **not** AxoriOS purple:

- **Personality:** capable, calm, confident, inclusive, premium but not mysterious.
- **Mood:** strong editorial typography; restrained orange illumination; generous negative space; minimal copy; high-contrast UI.
- **Typography:** `Onest` (or an equally legible contemporary sans) with `system-ui, sans-serif` fallback; prefer readable regular/medium weights over extremely thin display type. No tiny letter-spaced labels for critical information.
- **Palette (starting tokens, to test for contrast):**

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0D0F12` | Main dark background |
| `--surface` | `#191C21` | Raised surfaces, navigation, dialogs |
| `--surface-alt` | `#242830` | Hover/secondary surface |
| `--text` | `#FAF9F6` | Primary text |
| `--muted` | `#C6CAD1` | Secondary text (not low-opacity white) |
| `--accent` | `#FF713D` | Brand orange and focused accent |
| `--accent-hover` | `#FF895B` | Accent hover |
| `--accent-text` | `#17120F` | Dark text on orange buttons |
| `--focus` | `#FFD166` | Highly visible focus indicator |
| `--success` | `#7AE2AD` | Confirmed status with visible text |
| `--danger` | `#FF9B92` | Error status with visible text |
| `--border` | `#4A515C` | Field/divider outlines |

These are **design starting values**, not a claim of WCAG contrast success. Run contrast checks for each final text/background combination. Don't rely on color to convey status. Offer a high-contrast/bright display mode when feasible; honor system contrast/reduced-motion settings.

### Layout and decoration rules

- Avoid overused capsule chips, glassmorphic card piles, decorative feature grids, fake metrics or meaningless ambient UI.
- Use square-to-soft-corner shapes (8–12px radius), confident typography, real spacing hierarchy and only necessary dividers.
- Never obscure text, controls or focus rings with photography, glow, background gradients or animation.
- A cinematic orange-lit hero photo is **optional and decorative on the public introduction only**. The authenticated/app interface must not depend on imagery or VR symbolism. Do not imply a VR headset is necessary for accessibility.
- Avoid unverified claims such as "100% accessible", "safe by default" or "thousands of users".

### Spacing & sizing

- Base spacing 8px, with 4/8/12/16/24/32/48/64px steps; maximum content width ~1200px.
- Mobile side margins 20px, desktop 32–64px responsive; avoid horizontal scroll at 320 CSS px.
- Base body text 16–18px; critical transaction values 20–32px; avoid small legal text below 14px.
- Interactive targets aim for 44×44 CSS px or more, with visible labels and comfortable gaps.
- Buttons must clearly show disabled/loading state while remaining describable by assistive technology.

## 4. Information architecture

Use simple accessible app routing or view-state navigation; an SPA is fine. Every view has `<main>`, a single descriptive `<h1>`, a reliable place to return, and predictable focus management.

```text
Introduction (optional; no login gate)
   └── Open Readback
         ├── Home / What can I do?
         │     ├── Wallet / Check balance
         │     ├── Send SOL / Saved contacts
         │     ├── Activity / Explain transaction
         │     └── Explore Web3 (read-only learning)
         ├── Context assistant (typed + optional push-to-talk)
         └── Settings (sound, verbosity, motion/contrast, demo disclaimers)
```

### Screen A — Public introduction (optional, low-priority)

A compact, editorial homepage. Branding top left, just a few nav items, **Try Readback** CTA; large statement like **"Web3, without the guesswork."** Supporting copy: **"Explore Solana, understand every action, and approve with confidence."** One genuine product preview—not fictional usage statistics. Keep landing work under one small milestone. A functioning app home matters more than a cinematic marketing hero.

### Screen B — Home / Capability discovery (highest priority)

- Header: Readback, `Devnet — test funds only` label, Help/Settings.
- Heading: **"What would you like to do?"**
- One labelled request input + **Submit request** button. Distinct **Speak request** button if supported; microphone must never activate silently.
- Below: four **real** plain actions with icon + text (not pill badges): **Check balance**, **Send SOL**, **Recent activity**, **Explore Web3**.
- Compact **Current task** region: "You are on Home. No pending action." + **Where am I?**, **What can I do?**, **Repeat** controls (including keyboard-accessible versions).
- Device screen reader announces page title once and then relevant update; avoid an unsolicited long welcome monologue.
- If AI or voice is unavailable, all action buttons remain functional.

### Screen C — Wallet

- Heading: **"Your Devnet wallet"**.
- Current *real* balance with unit and selected network; loading/error states distinguishable in text.
- Address displayed as selectable text, **Copy address** button with accessible success message; optionally offer grouped spelling on request.
- **Refresh balance**, **Fund with test SOL** (link to official faucet), **Go to Send**, **View activity**.
- Disposable demo-wallet warning and lack of recoverability clearly visible. If wallet creation/persistence fails, fail clearly; never silently replace an existing identity.

### Screen D — Saved contacts

- List actual saved names with address summaries, accessible **Review** and **Remove** actions.
- Add flow: paste Solana address through a field; validate exact structure; read complete address in manageable groups on demand; show first/last characters; user must deliberately review a pasted address and verify it independently before saving.
- A last-four-character check catches some errors but does **not** establish the real-world recipient's identity.
- Name collisions, wrong network, malformed addresses and cancellation handled.
- Never pull a recipient address out of LLM text, recent transactions, token metadata or a user's spoken string.

### Screen E — Send SOL (proposal)

- Labelled **Contact** select (saved contacts only) and **Amount in SOL** field; exact decimal parsing to integer lamports; no floating-point fund math.
- Respect maximum test-transfer cap (default example: 0.5 SOL per transfer and 2 SOL per day, configurable in deterministic code).
- **Review payment** creates a pending unsigned proposal; no payment occurs yet.
- Optional assistant path "Send 0.2 SOL to Mum" populates this screen, never bypasses it.
- Deny unrecognized contact, zero/negative/overprecision/over-limit amount, wrong chain, insufficient funds.

### Screen F — Review / Explicit approval (security-critical)

A real modal or dedicated view with accessible dialog semantics:

```text
Review Devnet payment
Recipient: Mum (verified saved contact)
Amount: 0.20 SOL
Network: Solana Devnet
Estimated network fee: <computed estimate>
Estimated balance after: <computed estimate>
[Repeat details]   [Confirm test payment]   [Cancel]
```

- Use authoritative code-generated values from the exact validated transfer and network fee/simulation checks, not prose invented by an LLM.
- Fee is an **estimate**; a simulation is **not** a guarantee that submission succeeds.
- Move focus to the review heading/description, **not** to Confirm. Keep focus in dialog while active; return focus to invoking control after close.
- **Repeat details** re-announces without rerunning a transaction. **Escape** cancels safely when appropriate. No timed consent countdown.
- Stop listening while review is open. Spoken "confirm" must not approve the payment.
- User must activate the explicitly labeled confirm control via keyboard/screen-reader/switch-compatible interaction.
- Rebuild on blockhash refresh if needed, re-simulate, verify unchanged recipient, amount, chain, fee payer, instructions, and approved fee ceiling; ask for renewed review if material terms differ.
- Disable duplicate submission; use one-shot proposal status. Announce **submitted**, then **confirmed** only after actual network confirmation.

### Screen G — Activity / Result

- Show real transaction signature and network-specific Explorer link; labelled status: pending, confirmed or failed.
- Recent transaction summary derived from validated chain data; AI may explain a trusted fact object but must not fabricate network events or monetary values.
- Failure states offer safe next steps but never silently retry a payment.

### Screen H — Explore Web3 (read-only)

- Content: simple explainers for **Solana**, **staking**, **token swaps**, **network fees** and **wallet safety**.
- One question input; assistant returns short understandable explanations with a clear distinction: **"Learn about this"** versus **"Supported action"**.
- No executable swap/stake action or live price quote unless a real trusted integration is implemented and independently tested.
- Users can leave to check their wallet and **Return to previous task**; restore only non-sensitive context (never resurrect an approval or stale quote).

### Screen I — Settings

- Speech output: Off by default (avoid overlapping TalkBack/VoiceOver/NVDA).
- Voice input: opt-in push-to-talk, only where supported, with typed fallback and mic privacy explanation.
- Announcements: concise/expanded information density, without hiding required transaction details.
- Contrast: alternate high-contrast mode when feasible; respect reduced motion and zoom.
- Clearly display: Devnet only, no recovery or mainnet guarantees.

## 5. Screen reader / keyboard contract

- Semantic native controls first: `<button>`, `<input>`, `<select>`, `<a>`, `<form>`; never fake buttons using clickable `<div>`.
- Visible labels for controls; icon-only button must have accessible name. Use ARIA only to supplement semantics.
- Single main landmark, hierarchical headings and skip-to-main link. Set document title per view.
- Persistent, visually-hidden `role="status"` region for normal asynchronous updates; reserve `role="alert"` for urgent errors/refusals. Do not announce on every keystroke.
- Every action and error is understandable without color, imagery or sound; errors tied to fields; descriptions remain accessible.
- Focus should follow logical task flow: new screen heading after navigation; modal heading on open; invoking control on close; no focus loss after asynchronous data refresh.
- Keyboard: Tab/Shift+Tab; Enter/Space on native buttons; Escape cancels review if safe. No global key handlers that conflict with typing or assistive technology shortcuts.
- Zoom to 200% and reflow at narrow viewports. Reduced motion disables decorative movement; no essential auto-playing content.
- Voice input is push-to-talk; microphone is off by default, visible status while active, explicit stop/cancel, network/privacy warning. SpeechRecognition support detection and error messages required.
- TTS is optional, user-controlled and must not auto-start over screen readers.

### Accessibility test matrix

| Scenario | Minimum evidence |
|---|---|
| Keyboard-only | All core flows complete; visible focus; no traps |
| NVDA + Chrome/Edge on Windows | Buttons/labels/heading/readback/status announced accurately |
| TalkBack + Chrome on Android (if available) | Navigate, invoke assistant, cancel, approve with gestures |
| 200% zoom / 320px wide | Controls usable without horizontal content scroll |
| No microphone / AI outage | Typed and direct-button paths still function |
| Reduced motion | No distracting or essential animations |
| Error states | Bad address, cap violation, failed RPC, rejected simulation announced |
| Transaction confirmation | Pending != confirmed; correct Explorer link and signature |

Use automated axe checks for obvious defects, **plus** real assistive-technology checks. Do not claim blind-user validation without actual user participation.

## 6. Content and voice guidelines

- Short, concrete, matter-of-fact sentences. Announce **network**, **recipient**, **amount**, **fee estimate**, **consequence**, **status** in financial tasks.
- Never call a submitted transaction "sent" or "successful" before confirmation.
- Never say "I checked" unless data was actually retrieved; explain uncertainty/failed services.
- Offer progressive disclosure: concise summary first, details on demand.
- Avoid patronizing copy ("even blind people can..."). Inclusive wording: "Accessible by design; built for different ways of interacting."
- Example: "You are on Send SOL. You have selected Mum. Enter an amount or go back." (Derived from state.)
- Example: "I can explain staking, but staking transactions aren't supported in this demo." (Truthful limitation.)

## 7. Responsive behavior

- **Small screens (320–599px):** single-column, primary command entry then actions, no sidebar overlays by default; sticky action footer only if it doesn't obscure content or keyboard.
- **Tablet (600–1023px):** two-column for home action options where useful; forms remain single-column.
- **Desktop (1024px+):** stable narrow content column (~720px) for active tasks; optional left navigation and secondary contextual panel. Do not force reading across the full viewport.
- **Transaction review:** single-column content for scanability at all sizes; no horizontal swiping needed.

## 8. Visual deliverables and interaction states

Build actual functional UI states, not artboards alone: initial/load/empty/disabled/error, speaking/listening/transcribing, proposal preparation, simulation failure, review, submitting, pending, confirmed, rejected and canceled. Use skeletons only if they are non-confusing to screen readers.

No placeholder customer counts, earnings numbers, fabricated wallet balances, invented transaction confirmations or working buttons with no handlers. Any demo-only content must be marked as sample/educational.

## 9. MVP design acceptance checklist

- [ ] Every core task works by keyboard with no mouse or voice.
- [ ] Most important flows can be exercised with NVDA (and TalkBack if test hardware available).
- [ ] `Where am I?`, `What can I do?`, `Go back` and `Repeat` work *without* AI.
- [ ] Account/address/balance are real Devnet data, not hard-coded.
- [ ] Contact/amount/fee/instruction validation never delegated to the model.
- [ ] A full review is accessible and user approval is unmistakably separate from intent parsing.
- [ ] Repeated confirm, failure, timeout and RPC error states are safe.
- [ ] No page claims swaps or staking execution is available if not implemented.
- [ ] Mobile UI is usable without horizontal overflow, and user does not have to speak.
- [ ] All marketing statements are verifiable or appropriately qualified.

## 10. Supporting references

This design translates the existing Readback research and the follow-up *Readback: An Accessibility-First Gateway to Web3* architecture proposal into an implementable specification. Technical requirements are expanded implementation recommendations; these do not imply they were usability-tested.

- W3C APG: https://www.w3.org/WAI/ARIA/apg/
- WCAG quick reference: https://www.w3.org/WAI/WCAG22/quickref/
- Solana frontend docs: https://solana.com/docs/frontend
- Solana RPC: https://solana.com/docs/rpc/http/simulatetransaction
- Research (Zhou et al., SOUPS 2023): https://www.usenix.org/conference/soups2023/presentation/zhou
