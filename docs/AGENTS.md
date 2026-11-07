# Readback — Repository Instructions for Codex

You are implementing **Readback**, an accessibility-first gateway to Solana Web3, for a time-limited hackathon.

**Mandatory reading at the start of each task:**
1. `codex.md` — stack, boundaries, milestones and acceptance criteria.
2. `DESIGN_SPEC.md` — product, screens, copy, visuals and accessibility behavior.
3. Official docs/installed Solana developer skill when touching transactions.

Core principles:
- Work in small, tested milestones; be honest about what has been verified.
- Prefer native semantic HTML and screen-reader/keyboard usability over decoration.
- Only Solana **Devnet**; AI may interpret requests but may **never sign, authorize, set recipient addresses, or invent transaction data**.
- Do not expose or commit credentials, keypairs, or `.env.local`. Keep Groq server-side.
- Do not add full swaps, staking, MCP, Inngest, n8n, mainnet or production custody to the MVP.
- Install packages and implement integrations yourself. Ask the user only for required external authorization, account keys or risky irreversible decisions.
- Before changing any existing repo, inspect its structure and preserve unrelated work.
- End each milestone with concise changed-files, test results, blockers and remaining risks.

**Start with M0 and M1 in `codex.md`**; do not jump to voice or landing page polish.
