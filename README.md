# My-FlowBoard

Modern project management boards for teams — workspaces, boards, lists, and cards.

> Branding is centralized in `src/lib/branding.ts` and `NEXT_PUBLIC_APP_NAME`.

## Requirements

- Node.js 20+ (22/26 supported)
- Docker (for local PostgreSQL) **or** any PostgreSQL 14+ instance
- npm 10+

## Installation

```bash
npm install
cp .env.example .env
```

Generate an auth secret and put it in `.env`:

```bash
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 } | ForEach-Object { [byte]$_ }))
```

Or:

```bash
openssl rand -base64 32
```

## Environment variables

See [`.env.example`](.env.example) for:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js session secret |
| `STORAGE_*` / `CLOUDINARY_*` | Local or Cloudinary file storage |

## Database setup

Start local Postgres:

```bash
npm run db:up
```

Generate the Prisma client and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

Seed a development user (`john@acme.dev` / `password123`):

```bash
npm run db:seed
```

## Development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Documentation

| Doc | Audience |
| --- | --- |
| [`docs/DEV_GUIDELINES.md`](docs/DEV_GUIDELINES.md) | You — commands, setup, testing gate, workflows |
| [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) | Claude / Cursor — architecture, conventions, pitfalls |
| [`CLAUDE.md`](CLAUDE.md) | Claude Code entry (imports the docs above) |
| [`.cursor/rules/flowboard.mdc`](.cursor/rules/flowboard.mdc) | Cursor always-on project rule |

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Unit/integration tests (Vitest) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | E2E smoke tests (Playwright; builds first) |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run test:all` | Unit + E2E |
| `npm run db:up` / `db:down` | Docker Postgres start/stop |
| `npm run db:generate` | Prisma client generate |
| `npm run db:migrate` | Prisma migrate (dev) |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Prisma Studio |

Full command reference: [`docs/DEV_GUIDELINES.md`](docs/DEV_GUIDELINES.md).

## Testing

```bash
# Unit / integration (Vitest)
npm run test

# E2E smoke (Playwright) — builds the app, then starts it
# Requires DATABASE_URL and a seeded DB for the authenticated smoke test
npm run test:e2e

# Skip the login smoke test if you only want public-page checks
E2E_SKIP_AUTH=1 npm run test:e2e

npm run typecheck
npm run lint
```

Seed credentials for authenticated E2E / local demo:

- `john@acme.dev` / `password123` (workspace owner)
- `jane@acme.dev` / `password123` (workspace member — useful for card assignment)

Re-seed anytime with `npm run db:seed`.

## Production deployment

Designed for:

- **App**: Vercel (or any Node host running Next.js)
- **Database**: Supabase, Neon, RDS, or other PostgreSQL
- **Files**: Cloudinary (`STORAGE_PROVIDER=cloudinary`)

1. Set production env vars (never commit secrets).
2. Run `prisma migrate deploy` against production Postgres.
3. Deploy the Next.js app.
4. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` when enabling attachments.

## Architecture

- **Auth**: Auth.js (NextAuth v5) with email/password; OAuth-ready provider list
- **ORM**: Prisma + PostgreSQL
- **UI**: Next.js App Router, Tailwind CSS v4, shadcn/ui, next-themes
- **Storage**: Abstraction with local + Cloudinary providers (`src/lib/storage`)
- **Details**: [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md)

## Roadmap

1. Foundation — done
2. Workspaces — done
3. Boards / lists / cards — done
4. Drag and drop — done
5. Card features — done
6. Collaboration (activity, notifications, search, filters) — done
7. Calendar / table views — done
8. Polish — done
9. Testing — done
10. Production hardening — next
