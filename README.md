# Art Houz

Public gallery website and content management system (CMS) for Art Houz. Editors manage exhibitions, artists, artworks, fairs, news, locations, media and site settings in the admin app; the public site renders that content.

## Layout

| Path | What it is | Default port |
| --- | --- | --- |
| `apps/api` | NestJS 11 + Prisma 7 API (PostgreSQL, S3-compatible media storage) | 4100 |
| `apps/web` | Public site, Next.js 16 | 3100 |
| `apps/admin` | CMS, Vite + React 19 single-page app | 5180 |
| `packages/shared` | Zod schemas and types shared by the three apps (built with tsup) | - |
| `mockups/` | Static HTML mockups of the admin screens | - |
| `docs/` | Design spec and deploy notes | - |

## Prerequisites

- Node 22 (`.nvmrc`)
- pnpm 10
- PostgreSQL 16 or later with the `pg_trgm` extension (the first migration enables it)
- Google Chrome, only for the web visual and accessibility suites

## Local setup

```sh
createdb arthouz            # plus arthouz_test and arthouz_test_web for the test suites
cp apps/api/.env.example   apps/api/.env
cp apps/web/.env.example   apps/web/.env
cp apps/admin/.env.example apps/admin/.env
# edit apps/api/.env: set DATABASE_URL (the Prisma CLI needs an explicit user) and SEED_ADMIN_*
pnpm install
pnpm build:shared
pnpm --filter @arthouz/api exec prisma migrate deploy
pnpm --filter @arthouz/api db:seed
pnpm dev                    # api, web and admin in parallel
```

- API: http://localhost:4100 (`GET /health`)
- Site: http://localhost:3100
- Admin: http://localhost:5180 (fixed port, `--strictPort`)

The seed loads the prototype content and creates the admin user from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `apps/api/.env`. Sign in to the admin with those.

`.env.example` sets `STORAGE_DRIVER=memory`: uploads succeed but nothing is persisted and image URLs are `memory://...`. The media library accepts images (JPEG, PNG, WebP, AVIF, up to 25 MB) and videos (MP4, WebM, MOV, up to 200 MB); videos are library-only for now and are never offered in image pickers. To upload real files locally, set `STORAGE_DRIVER=r2` and the five `S3_ENDPOINT` / `AWS_*` keys (see `docs/deploy.md`).

`pnpm dev` starts the site against the API at `API_URL`; content pages are fetched from the API, so start the API first if the site shows an error.

## Tests

| Command | What it runs | Needs |
| --- | --- | --- |
| `pnpm test` | Unit tests in every package (jest for api, vitest for web, admin, shared) | - |
| `pnpm --filter @arthouz/api test:e2e` | API end-to-end tests (supertest), serial; migrates and truncates the test database | Database `arthouz_test`, or `DATABASE_URL_TEST` |
| `pnpm --filter @arthouz/web test:visual` | Pixel comparison of the site against the prototype at 375/768/1024/1440 px | Chrome, database `arthouz_test_web` (`VISUAL_DATABASE_URL`), free ports 3100 and 4100 (`VISUAL_API_PORT`, `VISUAL_WEB_PORT`) |
| `pnpm --filter @arthouz/web test:a11y` | axe accessibility and 44 px hit-area checks | Same as the visual suite |
| `pnpm --filter @arthouz/admin test` | Admin component tests (vitest, Testing Library) | - |
| `pnpm --filter @arthouz/admin test:e2e` | Admin Playwright end-to-end: sign in, create and publish an exhibition with an image, check it on the public site | Chrome, database `arthouz_test_e2e` (`E2E_DATABASE_URL`; its `public` schema is dropped each run), free ports 4102, 3102 and 5182 (`E2E_API_PORT`, `E2E_WEB_PORT`, `E2E_ADMIN_PORT`) |
| `pnpm lint`, `pnpm typecheck` | `tsc` / `eslint` across the workspace | - |

The visual and accessibility suites migrate and seed their own database, build the API and the site, and start both servers. Details, the prototype patches and the determinism rules are in `apps/web/reference/README.md`. Add `--grep about` to run one group.

`pnpm verify` runs typecheck, lint, every unit suite with its 80 % coverage gate, then the API, web and admin end-to-end suites in sequence (the web visual harness and the admin suite both build `apps/api/dist`, so they cannot run at the same time).

## Further reading

- `docs/superpowers/specs/2026-10-30-arthouz-cms-design.md` - design spec and recorded deviations
- `docs/deploy.md` - build outputs, environment, storage, reverse proxy (including the 200 MB upload body limit)
