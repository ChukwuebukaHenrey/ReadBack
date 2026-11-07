# External dependencies and remaining validation

No user decision is needed for the portrait redesign. The user selected the portrait reference and reported completing Groq/faucet setup.

- Vercel Production contains GROQ_API_KEY. Preview does not currently have that variable; Preview direct navigation still works.
- Devnet funding must be checked on-chain. The previously created disposable test wallet is 4AKNMLm1eQKdxNFUW26yJSmM6UuyKSkGYt5fvQMbDsup.
- Manual NVDA/TalkBack and disabled-user validation remain outstanding; automated checks do not replace them.
- This local environment rejects npm registry downloads. Missing Solana dependencies prevent a full local build. Vercel's build runs the full published-source checks.
- Local .git is read-only under the environment's permission profile; remote commits use the connected GitHub tools with an expected-head check.
