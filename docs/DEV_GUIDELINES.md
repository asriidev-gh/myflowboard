# My-FlowBoard — Developer Guidelines

Cheat sheet for local setup, daily commands, testing, and common workflows.
Architecture detail: [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).

## Prerequisites

- Node.js 20+ (22/26 OK)
- npm 10+
- PostgreSQL via Docker **or** hosted (Supabase/Neon/etc.)
- Playwright browsers once: `npx playwright install chromium`

## First-time setup

```bash
npm install
cp .env.example .env
# Set AUTH_SECRET (see below) and DATABASE_URL / DIRECT_URL
```

Generate `AUTH_SECRET`:

```bash
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 } | ForEach-Object { [byte]$_ }))

# macOS / Linux
openssl rand -base64 32
```

Database (Docker local):

```bash
npm run db:up
npm run db:generate
npm run db:migrate
npm run db:seed
```

Hosted Postgres (e.g. Supabase): skip `db:up`; set both URLs in `.env`, then `db:generate` → `db:migrate` → `db:seed`.

## Daily development

| Goal | Command |
| --- | --- |
| Dev server | `npm run dev` → http://localhost:3000 |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit tests | `npm run test` |
| Unit tests (watch) | `npm run test:watch` |
| Prisma Studio | `npm run db:studio` |
| Stop local Postgres | `npm run db:down` |

Seed login: **`john@acme.dev` / `password123`** (owner). Second demo user: **`jane@acme.dev` / `password123`**.

### After pulling schema changes

```bash
npm install
npm run db:generate
npm run db:migrate
# optional if seed data needed again
npm run db:seed
```

### Database scripts

| Script | When to use |
| --- | --- |
| `npm run db:up` | Start Docker Postgres |
| `npm run db:down` | Stop Docker compose |
| `npm run db:generate` | After schema/client changes |
| `npm run db:migrate` | Create/apply migrations (dev) |
| `npm run db:push` | Prototype only — push schema without migration files |
| `npm run db:seed` | Reset demo user/workspace data |
| `npm run db:studio` | Browse DB in browser |

Production migrate (deploy): `npx prisma migrate deploy` (not `db:migrate`).

## Testing

### Unit / integration (Vitest)

```bash
npm run test
npm run test:watch
```

- Config: `vitest.config.mts`
- Tests live next to code: `src/**/*.test.ts`
- Coverage focus: permissions, ordering, schemas, filters, views, search/my-work helpers, notification prefs, storage types

### E2E (Playwright)

```bash
# Builds app, starts production server, runs e2e/
npm run test:e2e

# Interactive UI mode (uses existing or starts via config)
npm run test:e2e:ui

# Public pages only (skip login smoke)
E2E_SKIP_AUTH=1 npm run test:e2e
```

Requirements for authenticated smoke:

1. Valid `DATABASE_URL` in `.env`
2. Seeded DB (`npm run db:seed`)
3. Port **3000** free — or kill the stale Next process if login/E2E flakes

Specs: `e2e/smoke.spec.ts`  
Config: `playwright.config.ts` (`reuseExistingServer: !CI`)

### Full quality gate (before PR / phase complete)

```bash
npm run test
npm run typecheck
npm run lint
npm run test:e2e
# or:
npm run test:all
npm run typecheck
npm run lint
```

Optional production build check:

```bash
npm run build
npm run start
```

## Code guidelines (short)

1. Put feature logic under `src/features/<domain>/` (actions, queries, schemas, components).
2. Validate inputs with Zod; enforce access with `permissions.ts`.
3. Prefer Server Actions for mutations; keep client components thin.
4. Board mutations: optimistic updates; do not remount the whole canvas on each change.
5. Attachments: respect 10MB app limit / 12mb server action body size.
6. DnD and theme toggles: avoid SSR/client markup mismatches (client-only where needed).
7. Match existing UI patterns (shadcn, Tailwind tokens); don’t invent a second design system.
8. Do not commit `.env`, uploads with secrets, or real Cloudinary/DB credentials.
9. Next.js 16: check `node_modules/next/dist/docs/` before using outdated App Router APIs.
10. Tests: add/adjust Vitest for pure helpers; extend Playwright only for critical user paths.

## Useful paths

| Path | Purpose |
| --- | --- |
| `src/lib/branding.ts` | Product name / tagline |
| `src/lib/auth/` | Auth helpers + permissions |
| `src/lib/db/prisma.ts` | Prisma client singleton |
| `src/lib/storage/` | Local + Cloudinary uploads |
| `src/proxy.ts` | Route protection |
| `prisma/schema.prisma` | Data model |
| `prisma/seed.ts` | Demo data |
| `.env.example` | Env template |

## Deploy notes (Phase 10 preview)

1. Set production env (never commit secrets).
2. `npx prisma migrate deploy`
3. Deploy Next app (e.g. Vercel).
4. `STORAGE_PROVIDER=cloudinary` + Cloudinary keys for shared attachments.
5. Confirm `AUTH_SECRET`, `AUTH_TRUST_HOST`, and public URL envs.

## When stuck

| Symptom | Try |
| --- | --- |
| E2E login fails / wrong app on :3000 | Kill process on 3000; re-run `npm run test:e2e` |
| Hydration / DnD warnings | Ensure DnD tree is client-mounted only |
| Upload fails ~1MB | Confirm `next.config.ts` `bodySizeLimit: "12mb"` |
| Prisma migrate vs pooler errors | Use `DIRECT_URL` on port 5432 for migrations |
| Empty board / no seed user | `npm run db:seed` |
