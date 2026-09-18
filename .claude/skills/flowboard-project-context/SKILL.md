***
name: flowboard-project-context
description: FlowBoard (TrelloReplica) architecture, conventions, commands, and testing. Use for any work in this repo — features, bugs, Prisma, auth, boards, E2E, or Phase 10 hardening.
***

Read and follow these project docs before changing code:

1. `docs/PROJECT_CONTEXT.md` — product, stack, layout, conventions, pitfalls, roadmap
2. `docs/DEV_GUIDELINES.md` — setup, npm scripts, Vitest/Playwright, quality gate

Key reminders:

- Next.js 16 — check `node_modules/next/dist/docs/` and `AGENTS.md`
- Features live under `src/features/<domain>/`
- Seed user: `john@acme.dev` / `password123`
- Phases 1–9 complete; Phase 10 only when asked
- After non-trivial changes: `npm run test`, `npm run typecheck`, `npm run lint`; use `npm run test:e2e` for auth/routing/critical paths
