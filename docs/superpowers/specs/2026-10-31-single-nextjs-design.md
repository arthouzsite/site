# Art Houz as a single Next.js project — design

Date: 2026-10-31. Requested in chat: "clone this app into another folder, make all these in a
single project, set us next.js project". The client said "ok proceed" without naming a host, so
every choice below is the builder's unless marked **client**. The clone lives at
`~/Documents/arthouz-next` (full history, taken from `feat/arthouz-cms` at ee217d7); the original
monorepo at `~/Documents/arthouz` is untouched and remains the reference for behaviour.

## Intent

One Next.js 16 application that serves the public site at `/`, the CMS at `/admin`, and the JSON
API at `/api`, with one build, one process, one `.env`, one test gate. Behaviour is identical to
the monorepo: same screens, same endpoints and envelope, same data, same pixel-exact site.

## Goals / non-goals / anti-goals

- Goals: a flat single-package repo; every one of the 83 endpoints available under `/api` with the
  same paths, methods, bodies, envelope and error codes; the CMS fully working under `/admin`;
  the site unchanged against the prototype baselines; `pnpm verify` green with the same gates
  (lint, typecheck, 80 % coverage, API database tests, visual + a11y, admin publish e2e); runs on
  a Node host (pm2) and, with the documented upload follow-up, on Vercel.
- Non-goals: new features; redesign of any screen; moving the CMS to server rendering or Next
  routing (see "CMS"); presigned browser-to-bucket uploads (follow-up, see "Media uploads");
  CI config; Docker.
- Anti-goals: changing prototype tokens or clamp values; changing the public API contract; losing
  any existing test; a second copy of any schema or helper.

## Repository layout (the whole repo is the Next app)

```
arthouz-next/
  app/
    (site)/            every current apps/web/app route, unchanged file-for-file (layout, pages,
                       robots, sitemap, icons, error boundaries); api/search stays as a route
    admin/
      layout.tsx       <html>-less segment layout: noindex metadata, admin fonts, .admin-root wrapper
      [[...slug]]/page.tsx   client-only mount of the existing React Router CMS (basename /admin)
    api/               route handlers: one folder per endpoint (see "API")
  components/site, components/admin (= apps/admin/src/{app,components,features,lib}), components/ui
  lib/
    shared/            = packages/shared/src (schemas, api envelope, format, tags) — imported as @/lib/shared
    server/            = apps/api/src minus Nest: config/env, prisma, auth, errors, envelope,
                       pagination, slugs, media (image, storage, video-signature, usage), domain
                       services + mappers per entity, public read services, search, seed helpers
    site/              = apps/web/lib (api → data loaders, nav, services, site-data, …)
  prisma/              schema, migrations, seed, seed-data, rehome-media (unchanged, plus one migration)
  styles/              tokens.css (merged), globals.css (site base), admin.css (scoped admin base)
  tests/
    unit/site, unit/admin, unit/server   vitest (jsdom for the first two, node for the third)
    api/                                 database-backed endpoint tests (ex apps/api/test)
    visual/, a11y/                       Playwright harness, unchanged logic; reference/ prototype
    e2e/                                 admin publish flow
  docs/, mockups/      unchanged
  next.config.ts, vitest.config.ts (projects), playwright.config.ts, playwright.e2e.config.ts,
  eslint.config.mjs, tsconfig.json, package.json (single), .env.example
```

`apps/`, `packages/`, `pnpm-workspace.yaml`, the Nest, Vite, Jest, supertest, passport,
cookie-parser, throttler and tsup dependencies are removed at the end of the migration, not before
the replacement is green.

## Shared code

`packages/shared` becomes `lib/shared` with the same module structure and exports; the package
build (tsup) disappears. All imports become `@/lib/shared`. `tagsFor`, envelope helpers, schemas
and format helpers are unchanged.

## API

### Route handlers

Every Nest controller method becomes a Next route handler in `app/api/<same path>/route.ts`
(Node runtime). Path parameters keep their names (`[id]`, `[slug]`, `[key]`, `[artistId]`,
`[workId]`). Query parsing, pagination and `withMeta` behave as today. The 13 public GETs live
under `app/api/public/...`. `GET /api/health` stays. The web revalidate webhook route is removed
(see "Revalidation").

### Cross-cutting layer (`lib/server/http`)

- `ApiException(status, code, message, fields?, details?)` replaces Nest's HttpException family.
  Domain code throws it; the handler wrapper maps it.
- `route(handler, options)` wraps every handler: parses the session cookie, enforces
  `options.auth` (`'public' | 'user' | 'admin'`), enforces the same-origin rule on non-GET
  requests, runs the handler, wraps the result in the `ok` envelope (or `withMeta`), and maps
  thrown `ApiException`, `ZodError` and Prisma errors to the exact status/code/message table of
  today's `HttpExceptionFilter` (P2002/P2003 → 409 CONFLICT, P2025 → 404, unknown → 500 INTERNAL
  with the message logged, never leaked). The filter's unit tests port to this mapper.
- `parseBody(schema, request)` / `parseQuery(schema, url)` replace `ZodBody` / `ZodQuery`.
- `prisma` is a module singleton built from `env.DATABASE_URL` with the pg adapter; the generated
  client moves to `lib/server/generated/prisma` (the Prisma schema generator output changes
  accordingly; `serverExternalPackages` lists `@prisma/client`, `sharp`, `argon2` if Next's
  bundler needs it).
- Domain services become plain modules exporting functions, or classes constructed once in
  `lib/server/services.ts`; either way no decorators and no DI container. Their unit tests port
  from Jest to Vitest with import changes only.

### Auth

- Session token: HS256 JWT with `{ sub }` and a seven-day expiry, signed with `jose` (replaces
  `@nestjs/jwt` + passport). Cookie `ah_session`: HttpOnly, SameSite Lax, Secure in production,
  path `/`, seven-day max age. Same name, same claims, same lifetime.
- `requireUser(request, role?)` reads the cookie, verifies, loads the user, rejects missing or
  disabled users with 401 `UNAUTHORIZED` "Please sign in again", and 403 `FORBIDDEN` for a role
  mismatch.
- CSRF: the API and CMS are same-origin now. For non-GET requests the wrapper rejects any
  request whose `Origin` header is present and differs from the request's own origin (403
  `BAD_ORIGIN`). `ADMIN_ORIGIN` and CORS configuration disappear.
- Login rate limit: the in-memory Nest throttler becomes a Postgres-backed fixed window
  (`LoginAttempt` rows keyed by client IP, same limits as `LOGIN_THROTTLE`, 429 `RATE_LIMITED`),
  so it holds across restarts and multiple instances. Client IP honours `TRUST_PROXY` hops from
  `x-forwarded-for`. One additive migration.
- Users, self-lockout and last-admin rules, argon2 hashing: unchanged.

### Revalidation

`RevalidateService.trigger(tags)` becomes `revalidateSite(tags)` in `lib/server/revalidate.ts`,
which calls `revalidateTag(tag, { expire: 0 })` directly. `WEB_URL`, `REVALIDATE_SECRET` and the
`/api/revalidate` webhook are removed. Unit tests mock `next/cache`.

### Media uploads

Uploads stay server-side: `POST /api/media` reads multipart via `request.formData()`, applies
the same MIME, size (25 MB images, 200 MB video), magic-byte and concurrency rules
(`MAX_CONCURRENT_UPLOADS`, 429 `TOO_MANY_UPLOADS`), processes images with sharp, writes to the
storage driver (R2 or memory) and returns the same Media row. The route sets
`maxDuration` to 600 s. This is the same behaviour and the same limits as today on a Node host.

Deliberately not done now: presigned browser-to-R2 uploads. They need a CORS rule on the shared
FindMyPlots `assets` bucket (Cloudflare dashboard) that cannot be made or tested from here. They
are required only on Vercel (4.5 MB request limit) and are documented in the README as the
follow-up, with the flow sketched (create upload → PUT to R2 → complete).

## Public site

- Pages, components, hooks and styles move unchanged. `lib/site/api.ts` keeps its public surface
  (`apiGet`, `apiGetUncached`, `ApiError`, `REVALIDATE_SECONDS`) but no longer performs HTTP:
  `apiGet(path, schema, tags)` resolves `path` against the public read services in
  `lib/server/public` through a small path table (`/public/home` → `getHome()`, `/public/
  exhibitions/:slug` → `getExhibition(slug)`, …), runs the loader inside Next's data cache keyed
  by `path` with the given `tags` and `REVALIDATE_SECONDS`, and validates the result with the
  same Zod schema. Callers stay exactly as they are, so the pages do not change.
- Caching primitive: `unstable_cache` is the direct equivalent of today's tagged fetch cache and
  keeps the build behaviour the harness depends on; the builder may use `'use cache'` +
  `cacheTag`/`cacheLife` instead if `next build`, `connection()` fallbacks and the search route
  behave identically under it. Whichever is used, `revalidateTag(tag, { expire: 0 })` must make
  the next request fresh; the admin publish e2e proves it.
- `app/api/search/route.ts` keeps calling `apiGetUncached`.
- `API_URL` disappears. `NEXT_PUBLIC_SITE_URL`, `IMAGE_HOST`, `TODAY_OVERRIDE`,
  `ALLOW_TEST_OVERRIDES`, `NEXT_IMAGE_UNOPTIMIZED` and the build-time site URL guard stay.
- Legacy redirects stay; none of them collide with `/admin` or `/api`.

## CMS

The CMS stays a client-rendered React Router application, mounted by Next:

- `app/admin/[[...slug]]/page.tsx` renders `<AdminApp />` with `ssr: false`; `AdminApp` is the
  current `main.tsx` body (QueryClientProvider, ToastProvider, RouterProvider) with
  `createBrowserRouter(routes, { basename: '/admin' })`. Route table, pages, hooks, forms and the
  AccountMenu are untouched.
- `components/admin/lib/api.ts`: base URL becomes `/api` (same origin, cookie sent
  automatically); `credentials: 'include'` and the XHR upload stay. `VITE_*` reads become
  constants: public site URL is `/`, API base is `/api`.
- `app/admin/layout.tsx`: `robots: noindex`, loads the admin fonts (the Google Fonts link from
  `index.html` moves to `next/font/google` or a `<link>`), wraps children in `.admin-root`.
- Styles: `styles/tokens.css` is the union of both token files (eleven names overlap; only the
  two font tokens differ, in fallback fonts only). Admin-only tokens are added to the site's
  `@theme`; the admin's two font tokens and its base rules (`body` font-size 14 px, font-family,
  background) are scoped under `.admin-root` in `styles/admin.css`. The site's global base rules
  apply site-wide and must produce identical pixels (the visual gate proves it); admin
  screenshots at 1440 and 390 are attached to the task report.
- Favicons: admin icon files move to `public/admin/` and the admin layout points at them; the
  site's `app/icon.*` stay.
- Unit tests move to `tests/unit/admin` unchanged apart from import paths; MSW handlers keep
  their `API_URL` constant (now `http://localhost/api`, matching the fetch calls under jsdom).

## Tests and gates

- `vitest.config.ts` defines three projects: `site` (jsdom, `tests/unit/site`), `admin` (jsdom,
  setup file, `tests/unit/admin`), `server` (node, `tests/unit/server` + `tests/api`). Coverage
  thresholds stay 80 % per project; the `server` coverage includes `lib/server` and `app/api`.
- API database tests (`tests/api/*.spec.ts`, ex `apps/api/test`) run against
  `DATABASE_URL_TEST` with the same migrate + truncate helpers. Instead of supertest against a
  Nest server they call the route handlers in-process through `tests/api/helpers/client.ts`,
  which resolves a method and path to the handler module under `app/api` (segment matching
  builds the `params` promise), builds a `Request` with the session cookie and JSON body, and
  returns `{ status, body }`. Specs keep their scenarios; only the call style changes.
- Playwright visual + a11y (`playwright.config.ts`): one `webServer` (migrate, seed, `next build`,
  `next start --port 3100`) with the visual database and `STORAGE_DRIVER=memory`; `tests/visual`
  and `tests/a11y` are otherwise unchanged, including the prototype normalisation patches (a)–(i)
  and the 0.005 pixel gate. Global setup probes `/api/public/locations`.
- Admin publish e2e (`playwright.e2e.config.ts`): one server on 3102 (schema reset, migrate,
  seed, build, start); fixtures point at `/admin` and `/api` on that origin.
- Lint: one flat ESLint config combining the web and admin configs (React, jsx-a11y, Next rules
  for `app/`). Typecheck: `tsc --noEmit` plus `next typegen`.
- `pnpm verify` = typecheck, lint, coverage (all three projects), API tests, visual + a11y,
  admin e2e.

## Environment and ports

Single `.env` (see `.env.example`): `DATABASE_URL`, `DATABASE_URL_TEST`, `JWT_SECRET` (≥ 32),
`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL`, `IMAGE_HOST`,
`STORAGE_DRIVER`, the five R2 variables, `TRUST_PROXY`, `TODAY_OVERRIDE`, `SEED_FORCE`.
Removed: `PORT`, `API_URL`, `WEB_URL`, `ADMIN_ORIGIN`, `REVALIDATE_SECRET`, `VITE_*`.

Dev server: `pnpm dev` = `next dev --port 3300` (site `/`, CMS `/admin`, API `/api`) against
the existing `arthouz_dev` database, which already holds the R2-hosted content; the one new
migration is additive and harmless to the old API. Test databases get new names so both repos
can run their suites side by side: `arthouz_next_test`, `arthouz_next_test_web`,
`arthouz_next_test_e2e`. Harness ports stay 3100 (visual/a11y) and 3102 (e2e); nothing on 4100,
4102, 5180 or 5182 is needed any more.

## Deployment notes (README)

Node host: `pnpm build && pnpm start` behind a reverse proxy with `TRUST_PROXY=1`; pm2 runs one
process; cookies are same-origin so no CORS. Vercel: works for everything except uploads above
4.5 MB until the presigned follow-up lands; set the R2 bucket CORS when doing it.

## Plan outline

Waves, each task reviewed before the next wave starts; parallel tasks run in worktrees:

1. **Skeleton** (sequential): flatten the repo, move shared + web + styles + prisma, single
   package.json, Next config, vitest projects, lint, typecheck; site unit tests and `next build`
   green with the site still reading the old API over HTTP as a temporary bridge.
2. **Server core** (sequential): env, prisma singleton, errors + envelope + route wrapper, auth
   (jose, cookie, rate limit migration), revalidate, media storage/image/video helpers, test
   helpers (`client.ts`, db), auth + health routes and their tests.
3. **Domains** (parallel, one task per group): exhibitions + works + artworks; artists; fairs +
   services + news; locations + settings + users; media; public reads + search. Each task ports
   services, mappers, routes, unit tests and the database specs for its group.
4. **Site data layer**: `apiGet` over the public services with tagged cache; remove the HTTP
   bridge, `API_URL`, the revalidate webhook; visual + a11y harness on the single server.
5. **CMS mount**: admin app under `/admin`, styles merge, fonts, favicons, unit tests, e2e
   harness; admin screenshots.
6. **Teardown and docs**: delete `apps/`, `packages/`, dead dependencies and env vars; README,
   `.env.example`, deploy notes; full `pnpm verify`; final whole-repo review.
