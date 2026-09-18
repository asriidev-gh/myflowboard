@AGENTS.md
@docs/PROJECT_CONTEXT.md
@docs/DEV_GUIDELINES.md

# FlowBoard agent notes

- Product is **FlowBoard** (Trello-inspired, not a visual/asset clone).
- Prefer `src/features/*` for domain work; keep shared primitives in `src/components` and `src/lib`.
- Phases 1–9 are complete; **Phase 10 = production hardening** unless the user asks otherwise.
- Always run relevant checks from DEV_GUIDELINES after non-trivial changes (`test`, `typecheck`, `lint`; `test:e2e` when touching auth/routing/critical flows).
- Next.js 16 has breaking changes — read local Next docs under `node_modules/next/dist/docs/` before inventing patterns.
