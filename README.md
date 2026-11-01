# Art Houz

Public gallery website and content management system (CMS) for Art Houz, one Next.js 16 app. Editors manage exhibitions, artists, artworks, fairs, news, services, locations, media and site settings in the CMS; the public site reads that content straight from the database.

- Site: `/` (App Router, `app/(site)/`)
- CMS: `/admin` (a client-rendered React Router app mounted by `app/admin/`; sources in `admin/`)
- API: `/api` (route handlers in `app/api/**`; logic in `lib/server`)

## Layout

| Path | What it is |
| --- | --- |
| `app/(site)/` | Public pages, with the site header and footer |
| `app/admin/` | Mount point of the CMS |
| `app/api/` | Route handlers, one folder per endpoint |
| `admin/` | CMS sources (app shell, components, features, lib, tests) |
| `components/`, `hooks/` | Site components and hooks |
| `lib/` | Site data layer (`api.ts`, `public-paths.ts`, ...) |
| `lib/server/` | Server code: env, Prisma client, auth, HTTP wrapper, domain services, storage, revalidation |
| `lib/shared/` | Zod schemas, types and helpers shared by the site, CMS and server |
| `prisma/` | Schema, migrations, seed, `rehome-media.ts`, `relink-media.ts` |
| `styles/` | Design tokens, site base, scoped CMS base |
| `tests/` | `unit/` (site), `api/` (database-backed endpoint specs), `visual/`, `a11y/`, `e2e/` |
| `mockups/`, `docs/` | Static CMS mockups; design specs, plans and deploy notes |

Unit tests for the CMS live next to their sources in `admin/`, and for the server in `lib/server/` and `lib/shared/` (`*.test.ts`).

## Requirements

- Node 22 (`.nvmrc`)
- pnpm 10
- PostgreSQL 17 with the `pg_trgm` extension (the first migration enables it)
- Google Chrome, for the Playwright suites (Playwright uses the installed Chrome and never downloads a browser)

## Environment

Configuration is read from the process environment; locally from `.env` at the repository root. No `.env*` file is ever committed (`.gitignore` ignores `.env` and `.env.*`), so create `.env` yourself from this table. `lib/server/env.ts` validates it at startup and lists every invalid key.

| Variable | Required | Purpose | Example placeholder |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string used by the app | `postgresql://USER:PASSWORD@HOST:5432/DBNAME` |
| `DIRECT_DATABASE_URL` | no | Non-pooled connection for `prisma migrate`; falls back to `DATABASE_URL` (with Neon, drop the `-pooler` host suffix) | `postgresql://USER:PASSWORD@HOST:5432/DBNAME` |
| `DATABASE_URL_TEST` | tests | Database for `tests/api`; must be local and named `*_test` or `*_test_t<N>` (the guard refuses anything else); every table is truncated | `postgresql://USER@localhost:5432/arthouz_next_test` |
| `JWT_SECRET` | yes | Signs the `ah_session` cookie; at least 32 characters | `<random string, 32+ characters>` |
| `SEED_ADMIN_EMAIL` | yes | Email of the admin user created by the seed | `admin@example.com` |
| `SEED_ADMIN_PASSWORD` | yes | Password of the seeded admin | `<choose a password>` |
| `NEXT_PUBLIC_SITE_URL` | build | Public origin, no trailing slash. Inlined at build time (canonical URLs, sitemap, robots). A production build fails if it is unset or a localhost URL | `https://www.example.com` |
| `MEDIA_URL_BASE` | no | Prefix of the media URLs stored in the database; default `/media` (served by this app from the private bucket). Set an absolute origin only when a CDN fronts the route | `/media` |
| `MEDIA_URL_TTL_SECONDS` | no | Lifetime of the signed media URLs, 3600 to 604800 seconds; default `604800` (7 days) | `604800` |
| `STORAGE_DRIVER` | no | `r2` (S3-compatible bucket, default) or `memory` (nothing persisted, still served at `/media/...`) | `r2` |
| `S3_ENDPOINT` | with `r2` | S3 API endpoint of the bucket | `https://ACCOUNT_ID.r2.cloudflarestorage.com` |
| `AWS_ACCESS_KEY_ID` | with `r2` | Bucket access key id | `<access key id>` |
| `AWS_SECRET_ACCESS_KEY` | with `r2` | Bucket secret key | `<secret access key>` |
| `AWS_S3_BUCKET_NAME` | with `r2` | Bucket name | `<bucket name>` |
| `TRUST_PROXY` | behind a proxy | Number of reverse-proxy hops whose `X-Forwarded-For` is trusted for the per-IP login limit. Default `0`; set `1` behind one proxy | `1` |
| `SEED_FORCE` | no | `1` makes the seed reload content over a database that already has it | `1` |
| `NEXT_DIST_DIR` | no | Build output directory, default `.next`; the Playwright harnesses use `.next-visual` and `.next-e2e` | `.next` |
| `TODAY_OVERRIDE` | tests only | Freezes "today" (`YYYY-MM-DD`) for exhibition status and the footer year | `2026-01-15` |
| `ALLOW_TEST_OVERRIDES` | tests only | `1` lets `TODAY_OVERRIDE` and `NEXT_IMAGE_UNOPTIMIZED` apply under `next start` | `1` |
| `NEXT_IMAGE_UNOPTIMIZED` | tests only | `1` serves images unoptimised | `1` |

`NODE_ENV` is set by Next. Never set `TODAY_OVERRIDE`, `ALLOW_TEST_OVERRIDES`, `NEXT_IMAGE_UNOPTIMIZED` or `DATABASE_URL_TEST` in a deployment. The harness-only variables `VISUAL_DATABASE_URL`, `VISUAL_WEB_PORT`, `VISUAL_PORT_URL`, `VISUAL_WRITE_ALL`, `E2E_DATABASE_URL` and `E2E_PORT` are read by the Playwright configs (see Tests).

## Development

```sh
pnpm install
pnpm exec prisma generate       # the Prisma client is generated into lib/server/generated and is not committed
pnpm db:migrate                 # prisma migrate deploy
pnpm db:seed                    # loads the prototype content and creates the admin user
pnpm dev                        # next dev on http://localhost:3300
```

- Site: http://localhost:3300/
- CMS: http://localhost:3300/admin (sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`)
- API: http://localhost:3300/api (`GET /api/health`)

The seed loads the prototype content, including the five services (published with placeholder copy to replace in the CMS), and writes picsum placeholder image URLs. It skips a database that already has content unless `SEED_FORCE=1`. `STORAGE_DRIVER=memory` accepts uploads but persists nothing; use `r2` with the four bucket variables for real files. The bucket stays private (see Media URLs); `GET /media/<key>` streams an object through the app as the fallback (byte ranges honoured for video, cached for a year). The media library takes images (JPEG, PNG, WebP, AVIF, up to 25 MB) and videos (MP4, WebM, MOV, up to 200 MB); videos are library-only and never offered in image pickers.

Content is cached with tags and refreshed when the CMS publishes. To move the seed's placeholder images into the bucket run `pnpm media:rehome` (with `STORAGE_DRIVER=r2`); it is idempotent and skips rows whose object already exists in the bucket. It runs outside the server, so it cannot refresh the cache: call `POST /api/revalidate` afterwards (see Expiring the site cache).

### Scripts

`db:seed`, `media:rehome` and `media:relink` run `tsx` and need the variables in the environment. Run other scripts the same way: `pnpm exec tsx --env-file=.env prisma/some-script.ts`.

| Command | What it does |
| --- | --- |
| `pnpm dev`, `pnpm build`, `pnpm start` | Next dev server and production server (both on port 3300), production build |
| `pnpm typecheck` | `next typegen && tsc --noEmit` |
| `pnpm lint` | ESLint over the whole repository |
| `pnpm test` | Vitest, all projects, no coverage |
| `pnpm test:coverage` | Vitest with the 80 % coverage gate (lines, functions, branches, statements) |
| `pnpm test:visual`, `pnpm test:a11y`, `pnpm test:e2e` | Playwright suites (below) |
| `pnpm verify` | Typecheck, lint, coverage, visual, a11y, e2e in sequence |

## Tests

Vitest runs three projects:

| Project | Files | Environment |
| --- | --- | --- |
| `site` | `tests/unit/**/*.test.{ts,tsx}` | node |
| `admin` | `admin/**/*.test.{ts,tsx}` | jsdom, MSW |
| `server` | `lib/server/**`, `lib/shared/**` unit tests and `tests/api/**/*.spec.ts` | node, serial |

`tests/api` needs a Postgres database named by `DATABASE_URL_TEST` in `.env` (default `postgresql://<user>@localhost:5433/arthouz_next_test`). It migrates the database and truncates every table, so use a throwaway database. Run one project with `pnpm exec vitest run --project server`.

The Playwright suites build and start their own production server, so their ports must be free (they refuse to reuse a running one). Each builds into its own directory so the `unstable_cache` data cache never leaks between harness databases. Both run against Chrome.

| Suite | Config | Port | Database (created beforehand; schema is migrated and seeded) | Build dir |
| --- | --- | --- | --- | --- |
| Visual (pixel comparison against the prototype at 375/768/1024/1440 px) and a11y (axe, 44 px hit areas) | `playwright.config.ts` | 3100 (`VISUAL_WEB_PORT`) | `arthouz_next_test_web` on `localhost:5433` (`VISUAL_DATABASE_URL`; the name must end in `_web`, host must be local) | `.next-visual` |
| Admin publish-flow e2e (sign in, create and publish an exhibition with an image, check it on the site) | `playwright.e2e.config.ts` | 3102 (`E2E_PORT`) | `arthouz_next_test_e2e` on `localhost:5433` (`E2E_DATABASE_URL`; the `public` schema is dropped every run; name must end in `_e2e`) | `.next-e2e` |

The visual suite answers the seed's picsum placeholder images with the same deterministic local PNG on the prototype and the port, so the comparison does not depend on the network; the a11y suite stubs remote images with a 1x1 PNG. Prototype patches and determinism rules are in `tests/visual/reference/README.md`. Add `--grep about` to run one group.

`pnpm verify` runs everything and needs: Chrome, Postgres with the databases above and `DATABASE_URL_TEST`, and ports 3100 and 3102 free.

## Deployment

Details in `docs/deploy.md`. In short:

- Node host: `pnpm install --frozen-lockfile`, `pnpm exec prisma generate` (the client is not committed, so run it on every fresh checkout), `pnpm db:migrate`, `pnpm build`, `pnpm start`. Run one process under pm2 behind a reverse proxy that terminates HTTPS and forwards to port 3300.
- Set `TRUST_PROXY=1` behind one proxy, otherwise every client shares the proxy's address in the login rate limit. The proxy must overwrite `X-Forwarded-For`.
- After out-of-band database changes or the media scripts, expire the cache with `POST /api/revalidate` as an admin (see Expiring the site cache); CMS publishing never needs it.
- Cookies and API are same-origin, so there is no CORS configuration. Write requests whose `Origin` differs from the request origin get `403 BAD_ORIGIN`.
- Set `NEXT_PUBLIC_SITE_URL` before `pnpm build`; changing it needs a rebuild. The build reads the database while prerendering, so `DATABASE_URL`, `JWT_SECRET` and `SEED_ADMIN_*` must be set for the build too, and so must `STORAGE_DRIVER` (or the five R2 variables, since production defaults to `r2`): the environment is parsed when the server modules are imported, which `next build` does.
- The build and deploy steps need devDependencies installed (`prisma`, `tsx`, `typescript`, `@tailwindcss/postcss`), so do not install with `--prod`.
- Allow request bodies of 200 MB and read timeouts of 600 s on `POST /api/media` at the proxy.
- Vercel's 4.5 MB request body limit blocks `POST /api/media` for larger files, so the CMS uploads straight to the bucket (see Uploads below), which needs a CORS rule on the R2 bucket. On Vercel set `TRUST_PROXY=1`, otherwise all clients share one login-throttle bucket. The upload route sets `maxDuration = 600`, which exceeds the Hobby plan's function limit; deploy on a plan that allows it or lower the value.

### Media URLs

Every media link the app emits (API responses and site pages) is a presigned `GET` URL on the R2 endpoint, so browsers load images and video straight from R2 while the bucket has no public hostname and needs no public access. Stored values stay `/media/<key>`; the URLs are produced when a response is built. URLs are signed at the start of each hour, so a given image URL is identical within an hour (browser caches hit) and changes in the next. Each stays valid for `MEDIA_URL_TTL_SECONDS` (7 days by default) from the moment it is served: the signing hour is added to the lifetime, capped at the 7-day SigV4 maximum, so with the default a URL served late in an hour has up to an hour less. A saved link stops working after that. `next/image` accepts the R2 hosts derived from `S3_ENDPOINT` and `AWS_S3_BUCKET_NAME`. Under the memory driver (tests, local runs without R2) links stay `/media/<key>`, served by the `/media` route, which also remains available as a fallback.

Staleness: a rendered page or Open Graph tag can carry a URL up to one revalidation window (an hour) plus idle time old, which is safe within the 7-day default. Because the URL changes every hour, `next/image` re-optimises each image once an hour. If signing fails for a key, the response keeps `/media/<key>` (the fallback route still serves it) and the failure is logged once per key per hour. Presentation applies only while `MEDIA_URL_BASE` is `/media`; an absolute CDN base is left as stored.

### Uploads

Media reaches the bucket in three steps, so the file bytes never pass through the app server (Vercel rejects request bodies over 4.5 MB):

1. `POST /api/media/uploads` with `{ filename, mime, bytes, alt }` checks the type (images: jpeg, png, webp, avif, up to 25 MB; videos: mp4, webm, mov, up to 200 MB) and answers `201 { key, method: 'PUT', url, headers, expiresAt }`. With the `r2` driver `url` is a presigned `PutObject` URL valid for 15 minutes with the content type signed.
2. The browser `PUT`s the file to `url` with the returned `headers`.
3. `POST /api/media/uploads/complete` with `{ key, alt }` checks the stored object (size, type, image decodes or video signature), stores the thumbnail and answers `201` with the `Media` row. A file that fails the checks is deleted from storage. A key can be completed once (`409 UPLOAD_ALREADY_COMPLETED`); a key with nothing stored is `400 UPLOAD_NOT_FOUND`.

The presigned URL also signs `cache-control` and the declared `content-length`, so a PUT with different bytes is refused by R2 (the browser sets the length itself; the client forwards only the returned `headers`). Uploads that are never completed stay in the bucket: periodically prune objects under `arthouz/<year>/` that have no `Media` row (a script is a follow-up).

With the `memory` driver (tests, local runs without R2) `url` is the same-origin `PUT /api/media/uploads/<key>`, which holds the body to the declared size and stores it in memory; with `r2` that route answers 404. `POST /api/media` (multipart) remains as the server-side alternative for API callers and small files.

The bucket needs this CORS rule (Cloudflare dashboard) or browsers refuse the `PUT`:

```json
[{ "AllowedOrigins": ["https://site-arthouz.vercel.app", "http://localhost:3300"],
   "AllowedMethods": ["PUT", "GET", "HEAD"],
   "AllowedHeaders": ["content-type", "cache-control"],
   "ExposeHeaders": ["etag"],
   "MaxAgeSeconds": 3600 }]
```

### Expiring the site cache

Public pages read data through `unstable_cache` with tags and refresh for up to an hour on their own. Publishing from the CMS expires the affected tags immediately and never needs the call below. After anything that changes the database from outside the app (`pnpm media:relink`, `pnpm media:rehome`, a manual SQL edit, a restore) expire the whole cache with an admin session:

```sh
curl -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"<password>"}' \
  https://your-site.example/api/auth/login
curl -b cookies.txt -X POST https://your-site.example/api/revalidate   # -> {"ok":true,"data":{"revalidated":<count>}}
```

`POST /api/revalidate` is admin-only (editors get 403, anonymous callers 401) and expires every tag, including the per-slug exhibition, artist and service tags. To expire only some, send `{"tags":["home","exhibitions"]}` (1 to 200 non-empty strings of at most 200 characters). The scripts run under `tsx`, where `revalidateTag` cannot run, so they only print a reminder.

## Known follow-ups

- Uploads are parsed in memory on a Node host, so concurrent uploads are capped (`TOO_MANY_UPLOADS`); the proxy limits above are the second line of defence.
- `media:rehome` and `media:relink` cannot refresh the page cache from outside the server; call `POST /api/revalidate` afterwards.
- Search endpoint (`/api/search`) has no rate limit of its own; throttle it at the proxy.
- The visual gate compares layout and text; images are neutral placeholders by design.

## Further reading

- `docs/superpowers/specs/2026-10-31-single-nextjs-design.md` - the single-app design
- `docs/superpowers/specs/2026-10-30-arthouz-cms-design.md` - original CMS design spec (describes the former monorepo)
- `docs/deploy.md` - build, proxy, storage and cookie notes
