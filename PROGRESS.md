# Build status — portrait design revision

The user selected Images/file_00000000579c8210b04be65c5023d8e2.png: centered portrait, oversized background lettering and dark editorial sections. Implemented in src/Landing.tsx and src/landing.css using the supplied portrait/mark assets. Removed obsolete introduction styles from src/style.css and raised small workspace copy/control text to at least 14px. Photography is decorative; headings, copy, navigation and disclosures remain semantic HTML. Unsupported reference claims and inactive carousel controls were not reproduced.

## Implemented milestones

- M0/M1: React/TypeScript foundation, deterministic navigation, typed requests, heading focus and live announcements.
- M2: persistent disposable browser signer, live Devnet genesis/balance check, public address copy and official faucet link.
- M3 partial: independently verified saved contacts and exact amount/cap policy. Transfer planning and approval remain unfinished.
- Optional Groq server endpoint and strict navigation-only schema implemented. Production secret presence confirmed; live request awaits the next deployment.
- Previous GitHub main (8f566ec) deployed successfully. This redesign is being published with build checks.

## Evidence from this revision

- Local ESLint passed.
- 23 tests passed across navigation, amount formatting, transfer policy, intent server and read-only Devnet relay.
- Edge viewport checks passed at 320, 390, 768, 1024 and 1440 CSS px, with one main landmark, one h1, no horizontal overflow, and links/disclosures at least 44px high.
- Keyboard skip link and native disclosure activation passed; no JavaScript exceptions.
- Reduced-motion emulation and 200%-equivalent viewport reflow passed. Actual browser zoom and manual NVDA/TalkBack have not been tested.
- Axe reported zero violations, with gradient/image contrast requiring additional review. Do not claim conformance.
- Existing wallet persistence and a real Devnet balance were verified in an earlier deployed run; no real transfer has been verified.

## Remaining

Deploy and inspect the redesign; verify Groq with the user's new Production key and recheck test-wallet funding. Finish deterministic transfer preparation/review/approval, actual confirmation, activity, and manual assistive-technology testing. Unfinished transfer modules in the local workspace are not included in this design release.
