# External dependencies and remaining validation

No user decision is needed for the portrait redesign. The user selected the portrait reference and reported completing Groq/faucet setup.

- Vercel Production Groq is verified working through the deployed API and browser UI. Preview does not currently have GROQ_API_KEY; Preview direct navigation still works.
- Devnet funding is verified: 2.5 test SOL at confirmed slot 519615713 for disposable test wallet 4AKNMLm1eQKdxNFUW26yJSmM6UuyKSkGYt5fvQMbDsup. No further faucet action is needed for the planned test transfer.
- Manual NVDA/TalkBack and disabled-user validation remain outstanding; automated checks do not replace them.
- This local environment rejects npm registry downloads. Missing Solana dependencies prevent a full local build. Vercel's build runs the full published-source checks.
- Local .git is read-only under the environment's permission profile; remote commits use the connected GitHub tools with an expected-head check.
