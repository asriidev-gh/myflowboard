# FlowBoard — Project Context (for AI agents)

Use this file as the source of truth for architecture, conventions, and gotchas.
Human day-to-day commands live in [`DEV_GUIDELINES.md`](./DEV_GUIDELINES.md).

## Product

- **Name**: FlowBoard (temporary; branding in `src/lib/branding.ts` + `NEXT_PUBLIC_APP_NAME`)
- **What**: Trello-inspired project management — workspaces, boards, lists, cards
- **Not**: A Trello clone of UI/assets; keep original design and naming

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js **16** (App Router), React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui (Base UI), Lucide, next-themes |
| Data | Prisma 6 + PostgreSQL (`DATABASE_URL` + `DIRECT_URL` for migrations) |
| Auth | Auth.js / NextAuth v5 — email/password, JWT sessions |
| Client state | TanStack Query |
| DnD | `@dnd-kit` |
| Uploads | `src/lib/storage` — `local` or `cloudinary` |
| Tests | Vitest (unit) + Playwright (E2E smoke) |

**Critical:** This Next.js version differs from older docs. Before changing framework APIs, read `node_modules/next/dist/docs/` and follow `AGENTS.md`.

## Repo layout

```
src/
  app/                 # Routes: (auth), (app), api/
  features/            # Domain modules (preferred place for feature code)
    auth|workspaces|boards|cards|notifications|search|my-work/
  components/          # Shared UI + layout + providers
  lib/                 # auth, db, storage, ordering, branding, utils
  proxy.ts             # Auth gate / middleware replacement (Next 16)
prisma/                # schema, migrations, seed.ts
e2e/                   # Playwright specs
docs/                  # This documentation
```

Feature modules typically contain: `actions.ts`, `queries.ts`, `schemas.ts`, `components/`, colocated `*.test.ts`.

## Domain model (high level)

User → Workspace(+members) → Board(+lists) → Card(+labels, members, due dates, comments, attachments)  
Also: Activity, Notification(+prefs), BoardStar, search over boards/cards.

Fractional **positions** for list/card order live in `src/lib/ordering/position.ts`.

## Conventions

1. **Server Actions** for mutations; Zod schemas in feature `schemas.ts`.
2. **Permissions** via `src/lib/auth/permissions.ts` — check before mutate/read.
3. **Optimistic UI** on board canvas (add/archive/move); avoid remounting the board on every mutation (`boardKey` remounts cause flash).
4. **Card detail**: prefetch / seed query cache; keep modal snappy.
5. **Uploads**: `serverActions.bodySizeLimit` is `12mb` in `next.config.ts` (matches ~10MB attachments + multipart overhead).
6. **DnD**: client-only mount to avoid hydration mismatches (`DndDescribedBy`).
7. **Login E2E**: form uses `data-testid="login-form"` + `data-ready="true"`; wait for ready before filling; navigate after `{ ok: true }`.
8. **Views**: board `?view=` (board / calendar / table) via `src/features/boards/views.ts`.
9. **Branding**: change product name only through branding env/helpers — not hard-coded strings everywhere.
10. Prefer matching existing patterns over inventing new folders or abstraction layers.

## Environment

See `.env.example`. Essentials:

- `DATABASE_URL` — app (Supabase pooler `:6543` + `pgbouncer=true` OK)
- `DIRECT_URL` — migrations (direct `:5432`)
- `AUTH_SECRET`, `AUTH_TRUST_HOST`
- `STORAGE_PROVIDER=local|cloudinary` + Cloudinary keys when needed

Seed user: **`john@acme.dev` / `password123`**

## Roadmap status

| Phase | Status |
| --- | --- |
| 1 Foundation | Done |
| 2 Workspaces | Done |
| 3 Boards / lists / cards | Done |
| 4 Drag and drop | Done |
| 5 Card features | Done |
| 6 Collaboration (activity, notifications, search, filters) | Done |
| 7 Calendar / table views | Done |
| 8 Polish | Done |
| 9 Testing | Done |
| 10 Production hardening | **Next** (rate limits, observability, CI hardening, deploy checklist, etc.) |

## Known pitfalls

- Stale process on port **3000** breaks Playwright (`reuseExistingServer`); kill it or set `CI=1` / free the port before `test:e2e`.
- Password special chars in DB URLs must be URL-encoded.
- Do not commit `.env` or secrets.
- `AGENTS.md` Next.js block may be rewritten by `next dev` — put lasting project rules in `docs/` and `.cursor/rules/`, not only inside that auto block.
