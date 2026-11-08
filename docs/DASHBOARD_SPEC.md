# Readback dashboard — product spec (draft for review)

**Status:** draft, 8 November 2026. Written before the dashboard visual reference arrives. Nothing here is implemented yet beyond what is marked **Built**.
**Scope:** the signed-in workspace at `/#app`. The landing page is out of scope.
**Rule that overrides any design choice:** AI understands and explains, code verifies, the person approves, Solana settles. No screen may weaken a guard (G1–G18 in `READBACK_BUILD_SPEC.md`).

---

## 1. What the dashboard has to do

Readback lets a blind or low-vision person use a Solana **Devnet** wallet on their own. The dashboard has to:

1. Get a person from zero to a funded test wallet.
2. Let them save recipients safely.
3. Send test SOL with a review they can hear and trust.
4. Tell them what happened (outgoing and incoming).
5. Explain things in plain words.
6. Never let AI, voice or a stray click move money.

Every screen must work with a keyboard and a screen reader **first**. Visual design is laid on top of that, never in place of it.

---

## 2. Honest lifecycle: "sign up" to "log out"

Readback has **no accounts, no server login and no password**. The "account" is a disposable Devnet key that lives only in this browser (non-extractable WebCrypto key in IndexedDB). The dashboard must say so plainly and never imitate a login it doesn't have.

| Stage | What it really is | Status |
| --- | --- | --- |
| Sign up | Create the disposable Devnet wallet after acknowledging "no recovery" | **Built** (Wallet panel) — needs to become a guided onboarding |
| Sign in | Automatic: the saved key is reloaded and verified when the app opens | **Built** (silent) — needs a visible "Wallet loaded" state |
| Fund | Get test SOL from faucet.solana.com (needs a human; public airdrop returns 410) | **Built** (link) — needs a guided step and a live "funds arrived" signal |
| Use | Balance, contacts, send, activity, explain, learn | **Built** — needs the new layout |
| Session end ("log out") | See §2.1 — decision needed | **Not built** |
| Delete | Reset demo wallet: deletes the key permanently | **Built** (Settings) |

### 2.1 Decision needed: what does "Log out" mean?

The key stays in the browser whatever the UI does. Options:

| Option | What it does | Honest label | Effort |
| --- | --- | --- | --- |
| **A. Leave workspace** (recommended for the hackathon) | Clears on-screen state, cancels any review, returns to the landing page. The wallet stays in this browser. | "Leave Readback". Subtext: "Your test wallet stays in this browser." | Small |
| B. Lock with a passcode | Wraps the key with a passcode-derived key. Unlocking is needed before signing. | "Lock wallet" | Large. New crypto, new failure modes, new accessibility flow. Roadmap. |
| C. Reset wallet | Deletes the key. Already exists. | "Delete demo wallet" (never "Log out") | Done |

**Recommendation:** ship A as "Leave Readback", keep C in Settings, and put B on the roadmap. Do not label A "Log out": it would wrongly imply the wallet is protected afterwards.

---

## 3. First-run onboarding (replaces today's bare wallet panel)

A short, linear, skippable-only-where-safe flow. One task per step, one heading per step, focus on the heading.

| Step | Content | Exit condition |
| --- | --- | --- |
| 1. Welcome | What Readback is, in two sentences. "Devnet only. Test SOL has no value." How to navigate: headings, Tab, the Ask box, "What can I do?". | Continue |
| 2. Understand the wallet | "This creates a test wallet in this browser. There is no recovery: clearing browser data or switching browsers loses it." Checkbox to acknowledge (existing). | Checkbox + "Create my test wallet" |
| 3. Wallet created | Address with Copy, and "Read address with letter case" (case-aware speller, **Built**). | Continue |
| 4. Add test SOL | Faucet link (opens a new tab, says so). "We'll tell you when it arrives." Live listener announces the arrival (incoming watcher, **Built**). | Funds arrive, or "Skip for now" |
| 5. Add your first contact (optional) | Inline contact flow (§6.4). | Save, or "Skip for now" |
| 6. You're ready | Three things you can do now. "Try: What's my balance?" | Go to Home |

**Rules:**
- Onboarding is shown only while no wallet exists. Once the wallet exists, steps 4–5 appear as a dismissible **Setup checklist** on Home (Fund wallet, Add a contact, Send a first test payment), never as a blocker.
- If the browser can't create a non-extractable key or open IndexedDB, show the existing failure message and stop. No fake wallet.

---

## 4. App shell (every screen)

### 4.1 Layout

| Region | Desktop (≥1024px) | Tablet (600–1023px) | Phone (<600px) |
| --- | --- | --- | --- |
| Top bar | Logo · "Devnet · test funds" badge (text, not colour) · short address + Copy · "Ask Readback" button · account menu | Same, logo smaller | Logo · Devnet badge · "Ask" icon button (with a text label) · menu |
| Primary navigation | Left sidebar: Home, Send, Activity, Contacts, Learn, Settings | Collapsible sidebar or top tabs | Bottom tab bar (Home, Send, Activity, Contacts, More). Learn and Settings live under More. |
| Main | Current view, one `h1`, focus moves to it on view change (**Built**) | Same | Same |
| Assistant | Persistent panel at the bottom of main, or a right rail | Bottom of main | Full-screen sheet opened from "Ask" |
| Status line | One `role="status"` region, always in the DOM (**Built**) | Same | Same |

### 4.2 Account menu (top-right)

- Wallet address (short) and Copy full address
- "Read address with letter case"
- View on Solana Explorer (new tab)
- Settings
- Leave Readback (§2.1 A)

### 4.3 Global behaviour (keep — **Built**)

- Skip link → main (fixed this week so it no longer leaves the app)
- "Where am I?", "What can I do?", "Go back", "Repeat" (Repeat never repeats an action)
- No global keyboard shortcuts (they clash with screen-reader keys)
- Busy buttons stay focusable with `aria-disabled`; focus never drops to `<body>`

---

## 5. Home (dashboard overview)

In priority order, top to bottom (reading order is the visual order):

1. **`h1` greeting:** "Your wallet". No personalised name; there is no account.
2. **Balance card:** live balance ("2.5 SOL on Devnet"), confirmed slot and checked-at time, Refresh. Faucet link when balance < 0.1 SOL. Must say "Unavailable" rather than a stale number when the network fails. (**Built** data, new layout.)
3. **Quick actions:** Send SOL · Add contact · Explain last payment · What can I do? (real buttons)
4. **Setup checklist** (§3), until complete or dismissed.
5. **Today's limits:** "0.5 SOL per payment. 1.5 SOL left today." with a text-labelled meter. "Checked in this app, not on-chain." (**Built** data.)
6. **Recent activity:** last 3 items ("Sent 0.2 SOL to Mum, 2 minutes ago, confirmed"), plus a "View all activity" link. (**Built** data.)
7. **Latest incoming payment:** the last announcement repeated as text, including the dust/scam warning wording. (**Built** data.)
8. **Unresolved payment banner** (only when one exists): "A payment's outcome is still being checked. Don't send it again." with "Check status". Highest priority: shown above the balance when present.
9. **Wallet notice:** "Devnet demo wallet. No backup. Clearing browser data loses it."

**States to design:** no wallet (→ onboarding) · wallet loading · funded · zero balance · network unavailable · unresolved payment present · daily limit reached.

---

## 6. Screens

### 6.1 Send SOL (**Built** logic; new layout)

- **Form:** saved-contact `<select>` (never a free-text address), Amount in SOL ("Up to 0.5 SOL", `inputmode="decimal"`), Review payment.
- **From the assistant:** the form shows what was understood ("Your request filled these fields. Nothing has been approved.").
- **Inline errors**, announced via `role="alert"`, in plain words.
- **Show remaining daily allowance** next to the amount.
- **Empty state:** no contacts → "Add a contact first", with a button.

### 6.2 Review payment dialog (**Built**; restyle only, never weaken)

- Native modal dialog. Focus starts on the heading, never on Confirm. The readback is the dialog's description (**Built**).
- Readback from the decoded transaction, fee and simulation. Details list: recipient, full address, amount, fee, balance after, network.
- Buttons in this order: Read full address (with letter case) · Repeat details · **Confirm test payment** · Cancel.
- Confirm needs a trusted click or key press; Escape cancels. While sending, Escape says "can't cancel now" (**Built**).
- **Result states:** Confirmed (signature, Explorer link, consent receipt) · Failed (plain reason, "No SOL left your wallet" when true) · Pending ("Don't send again", "Check confirmation").
- **Visual rule:** Confirm is visually primary but never pre-focused, never animated to draw a click, and never on a timer.

### 6.3 Activity (**Built** data; new layout)

- List, newest first: direction, amount, contact or "unknown address ending ABCD", time, status (text label, not colour alone), signature, Explorer link.
- Per item: "Explain this payment" (**Built**) and "Retry the same signed payment" (unresolved only, **Built**).
- **Filters:** All · Sent · Unresolved. **Incoming history** (from on-chain reads) is new work. Today the ledger holds only payments sent from this browser.
- **Empty state:** "No payments yet. Try 'Send 0.1 SOL to Mum'."

### 6.4 Contacts (**Built** logic; new layout)

- List: name, short address, "Read address with letter case", Rename, Remove (with confirmation; today it removes immediately — fix).
- **Add contact:** name → paste address → automatic safety check (lookalike, program, off-curve, no history; **Built**) → address spelled with case → retype last four with case feedback (**Built**) → "I verified this with the person" → second confirmation if flagged (**Built**) → saved.
- **Empty state:** why contacts exist ("Readback only sends to people you've verified").
- Contact count shown. "What can I do?" mentions contacts (**Built**).

### 6.5 Learn (**Built**; freeze content)

- The five topics as headings plus disclosures. Each ends with a real next step ("Try sending 0.1 SOL to a saved contact").
- Staking and swaps are clearly "Learn only. Readback can't do this."

### 6.6 Settings (**Built**; extend)

- **Speech:** app speech on or off (off by default), rate, test.
- **Keyboard help:** the list we have now.
- **Display (new):** high-contrast mode toggle and a text-size preference. Reduced motion follows the system setting.
- **Announcements (new, optional):** concise or detailed status messages. Never hides transaction details.
- **Wallet:** address, Explorer link, Reset demo wallet (confirmation dialog; blocked while a payment is unresolved, **Built**).
- **About:** Devnet only, not audited, limits are app-side, links to GitHub and the licence.

### 6.7 Assistant ("Ask Readback")

- Label "Ask Readback", max 300 characters, Send, and examples.
- Opt-in Groq toggle with the existing privacy note (contacts never sent).
- **Follow-up questions:** "How much SOL?" keeps the partial request (max 3 follow-ups, **Built**).
- **Refusals:** the alert region, plain words (**Built**).
- **Answers it can give:** balance, "where am I", "what can I do", explain last, learn topics, open views, prefill a payment. Never approve or send.
- **Voice input:** not built. If added later (P2), push-to-talk only, mic off during review, and typing always available.

---

## 7. Cross-cutting requirements

### 7.1 Accessibility (non-negotiable, already tested — keep the tests green)

- One `h1` per view, logical `h2`/`h3`. Landmarks: banner, navigation, main, contentinfo.
- Focus: view heading on navigation; dialog heading on open; opener on close; never `<body>`.
- One status region, plus alerts only for refusals and failures.
- Information never by colour, icon or position alone.
- Targets ≥44px. Visible focus everywhere. 320px reflow and 200% zoom. Reduced motion. Forced-colours mode.
- Every new screen gets a step in `e2e/blind-journey.spec.ts` and an axe scan.

### 7.2 Safety (unchanged by redesign)

Saved contacts only · exact amounts · caps checked in code · Devnet genesis check · instruction allowlist (transfer + consent receipt) · deterministic readback · trusted-click confirm · one-shot send with polled confirmation · no AI-written numbers (G16) · on-chain text never read as instructions.

### 7.3 Truthfulness in UI

- No invented balances, history or "success". Mock-ups carry an "Example" label.
- "Sent" only after confirmed. "Unavailable" when we don't know.
- Never call the browser wallet "secure" or "logged in".

### 7.4 States every view must design

Loading · empty · populated · network error · storage unavailable · wrong network · busy (`aria-disabled`) · success · failure.

---

## 8. Data sources (all real; no new backend needed)

| UI element | Source |
| --- | --- |
| Balance, slot | `getBalance` via the `/api/devnet` relay |
| Address | Wallet service (public key only) |
| Contacts | IndexedDB `readback-contacts` |
| Payments, daily allowance | IndexedDB ledger + `getSignatureStatuses` |
| Incoming payments | WebSocket `accountNotifications` + `getTransaction` |
| Fee, readback | `getFeeForMessage` + `simulateTransaction` |
| Explanations | Ledger + on-chain fee; optional Groq narration, number-checked |
| Incoming history (new) | `getSignaturesForAddress` + `getTransaction` (both already allowlisted) |

---

## 9. Build order once the visual reference arrives

1. App shell: top bar, account menu, sidebar or bottom tabs, assistant placement. Keep every existing test green.
2. Home: balance card, quick actions, limits meter, recent activity, unresolved banner.
3. Onboarding flow and setup checklist.
4. Restyle Send, the review dialog, Activity (plus filters) and Contacts (plus the remove confirmation).
5. Settings additions: display options, "Leave Readback".
6. Incoming history in Activity.
7. Blind-journey and axe coverage for every new screen; screenshots at 320, 390, 820 and 1440px.

---

## 10. Open questions for you

1. **Log out:** ship option A "Leave Readback" now and put the passcode lock on the roadmap? (Recommended.)
2. **Mobile navigation:** bottom tab bar (recommended, thumb-reachable, familiar to TalkBack users) or a hamburger menu?
3. **Assistant placement:** persistent panel at the bottom of each view (current) or a right-hand rail on desktop?
4. **Onboarding:** full-screen steps (recommended for screen readers: one task at a time) or a card on Home?
5. **Theme:** match the new light landing page, or keep the dark workspace with a light option?
6. **Incoming history:** in scope before the deadline, or roadmap?
