# Single Next.js Project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `arthouz` monorepo (Next.js site + Vite CMS + NestJS API + shared package) into one Next.js 16 application serving `/`, `/admin` and `/api` with identical behaviour and the same test gates.

**Architecture:** The site keeps its pages and its `apiGet(path, schema, tags)` surface, but `apiGet` now calls the public read services in-process through Next's tagged data cache. The CMS stays a React Router client app mounted by a catch-all `/admin` page. Every Nest controller method becomes a route handler under `app/api`, sharing a small `route()` wrapper that does session, origin check, envelope and error mapping; domain services lose Nest decorators and become plain modules over a Prisma singleton.

**Tech Stack:** Next.js 16 (App Router, Node runtime route handlers), React 19, Prisma 7 + PostgreSQL 17, Zod 4, Tailwind 4, `jose` for the session JWT, argon2, sharp, AWS SDK v3 (R2), TanStack Query + React Router 7 (CMS), Vitest (three projects), Playwright (Chrome channel), pnpm (single package).

**Spec:** `docs/superpowers/specs/2026-10-31-single-nextjs-design.md`

## Global Constraints

- Same endpoint paths, methods, bodies, envelope `{ ok, data, error, meta? }`, error codes and messages as the monorepo; the API database specs are the contract and port with their scenarios intact.
- Public site pixels unchanged: visual gate max diff 0.005 against the normalised prototype at 375/768/1024/1440; prototype tokens and clamp values never change; `TODAY_OVERRIDE=2026-10-30` frozen date in harnesses.
- Session cookie `ah_session`, HttpOnly, SameSite Lax, Secure in production, path `/`, seven days; claim `{ sub }`, HS256, `JWT_SECRET` ≥ 32 chars.
- Login throttle: 5 failures per 60 s per client IP → 429 `RATE_LIMITED`; database-backed.
- Upload limits: images ≤ 25 MB (`MAX_IMAGE_UPLOAD_BYTES`), videos ≤ 200 MB (`MAX_VIDEO_UPLOAD_BYTES`), `MAX_CONCURRENT_UPLOADS=2` → 429 `TOO_MANY_UPLOADS`; magic-byte check for video; images only where content references media (`assertMediaExists`).
- Coverage ≥ 80 % lines/functions/branches/statements per Vitest project; no test deleted, only ported.
- Repo rules: immutable data, files ≤ 400 lines (800 hard), no filler UI copy, no native dialogs, no `rm` in commands, stage by explicit path, commit messages `<type>: <description>` with no attribution trailers, Sonnet/Opus subagents only.
- Databases: dev `arthouz_dev` (shared with the old repo, additive migration only); tests `arthouz_next_test`, `arthouz_next_test_web`, `arthouz_next_test_e2e` on `localhost:5433`. Ports: dev 3300, visual/a11y 3100, e2e 3102.
- Next.js 16 differs from training data: read `node_modules/next/dist/docs/` for route handlers, `unstable_cache`/`use cache`, `revalidateTag`, `next/font`, `serverExternalPackages` before writing code.

## Review Focus

1. A request carrying a valid cookie for a user who was deleted or disabled after signing in must get 401 and no data (Task 2 tests `requireUser`).
2. A non-GET request whose `Origin` header differs from the request origin must get 403 `BAD_ORIGIN`; a request with no `Origin` header (curl, server-to-server) must be allowed (Task 2 route wrapper tests).
3. A body that is not JSON, or JSON that is not an object, must produce 400 `BAD_REQUEST`, never a 500 (Task 2 `parseBody` tests).
4. A multipart upload whose declared size exceeds the limit must be rejected with 413 before sharp or the storage driver runs, and the concurrency slot must be released on every exit path (Task 7 tests).
5. Reloading a deep CMS link such as `/admin/exhibitions/<id>` while signed out must land on `/admin/login?next=/exhibitions/<id>` (basename-relative) and return to that editor after login (Task 10 e2e).

---

### Task 1: Flatten the repo into one Next.js package

**Files:**
- Move (git mv): `apps/web/app` → `app`, `apps/web/components` → `components`, `apps/web/hooks` → `hooks`, `apps/web/lib` → `lib`, `apps/web/styles` → `styles`, `apps/web/tests` → `tests`, `apps/web/reference` → `tests/visual/reference` (update `tests/visual/paths.ts`), `apps/web/{next.config.ts,postcss.config.mjs,playwright.config.ts,eslint.config.mjs,vitest.config.ts}` → root, `apps/web/public/*` → `public/`; `packages/shared/src` → `lib/shared`; `apps/api/prisma` → `prisma`, `apps/api/prisma.config.ts` → root; `apps/admin/src` → `admin`.
- Create: `package.json` (single package, `"type": "module"`, `"name": "arthouz"`), `tsconfig.json` (paths `@/*` → `./*`), `.env.example`, `.env` (copied values from `apps/api/.env` and `apps/web/.env`; never printed).
- Modify: `prisma/schema.prisma` generator `output = "../lib/server/generated/prisma"`; `next.config.ts` (drop `transpilePackages`, add `serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'sharp', 'argon2']`); every `@arthouz/shared` import under `app/`, `components/`, `hooks/`, `lib/`, `tests/` → `@/lib/shared`; `vitest.config.ts` → projects form with only `site` active (`tests/unit/**/*.test.{ts,tsx}`, node environment, coverage include `app lib components hooks`, exclude `lib/server lib/shared admin`).
- Delete (git rm): `pnpm-workspace.yaml`, `apps/web/package.json`, `packages/shared/{package.json,tsup.config.ts,tsconfig.json}`, `apps/web/tsconfig.json`. Leave `apps/api`, `apps/admin` (minus `src`) and their `package.json` files in place until Task 11.

**Interfaces:**
- Produces: import alias `@/lib/shared` (same exports as `@arthouz/shared`), `@/lib/...` for site helpers; scripts `dev` (`next dev --port 3300`), `build`, `start`, `lint`, `typecheck` (`tsc --noEmit && next typegen`), `test` (`vitest run`), `test:coverage`, `test:visual`, `test:a11y`, `test:e2e`, `db:migrate`, `db:seed`, `media:rehome`, `verify`.

- [ ] **Step 1: Move the trees with `git mv` and write the single `package.json`**

Dependencies = union of the four packages minus `@nestjs/*`, `rxjs`, `reflect-metadata`, `passport*`, `cookie-parser`, `@nestjs/throttler`, `supertest`, `jest`, `ts-jest`, `vite`, `@vitejs/plugin-react`, `tsup`, `express`, `multer`. Add `jose`. Keep `tsx` for prisma scripts. Root `verify` script = `pnpm typecheck && pnpm lint && pnpm test:coverage && pnpm test:visual && pnpm test:e2e`.

- [ ] **Step 2: Fix imports and configs**

Run: `grep -rl "@arthouz/shared" app components hooks lib tests | xargs sed -i '' "s#@arthouz/shared#@/lib/shared#g"` then `pnpm install`, `pnpm exec prisma generate`.

- [ ] **Step 3: Verify the site still builds and tests**

Run: `pnpm lint && pnpm typecheck && pnpm test` → site unit tests pass (184 today). Run: `API_URL=http://localhost:4200 NEXT_PUBLIC_SITE_URL=http://localhost:3300 pnpm build` → exit 0 (the old API on 4200 is the temporary bridge; `lib/api.ts` is still HTTP in this task).

- [ ] **Step 4: Commit**

```bash
git add -A app components hooks lib styles tests public prisma prisma.config.ts admin package.json pnpm-lock.yaml tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs vitest.config.ts playwright.config.ts .env.example
git commit -m "refactor: flatten the monorepo into a single Next.js package"
```

---

### Task 2: Server core — env, Prisma, HTTP wrapper, auth, revalidation, common helpers, test harness

**Files:**
- Create: `lib/server/env.ts`, `lib/server/prisma.ts`, `lib/server/clock.ts` (= `config/clock.ts`), `lib/server/http/errors.ts`, `lib/server/http/route.ts`, `lib/server/http/parse.ts`, `lib/server/http/cookies.ts`, `lib/server/auth/{constants,session,current-user,origin,client-ip,login-throttle,password,public-user,auth.service}.ts`, `lib/server/revalidate.ts`, `lib/server/common/{pagination,slugs,exact-order,media-exists,image.mapper}.ts` (ported), `app/api/health/route.ts`, `app/api/auth/{login,logout,me}/route.ts`, `prisma/migrations/<ts>_login_attempts/migration.sql`, `tests/api/helpers/{db,client,resolve,users}.ts`, `tests/api/{auth,health}.spec.ts`, `vitest.setup.server.ts`.
- Test: `lib/server/http/errors.test.ts` (port of `http-exception.filter.spec.ts`), `lib/server/http/route.test.ts`, `lib/server/http/parse.test.ts`, `lib/server/auth/{session,current-user,login-throttle,client-ip}.test.ts`, `lib/server/common/*.test.ts` (ported), `lib/server/revalidate.test.ts`.
- Modify: `prisma/seed.ts` and `prisma/seed/*` (imports from `../src/...` → `../lib/server/...`: password hashing, tags, clock; `tsx` resolves the tsconfig paths), `prisma/schema.prisma` (+ `model LoginAttempt { ip String @id; count Int; windowStart DateTime }`), `vitest.config.ts` (add `server` project: node env, include `lib/server/**/*.test.ts` and `tests/api/**/*.spec.ts`, `fileParallelism: false`, setup file loads `.env.test` values: `DATABASE_URL_TEST`, `JWT_SECRET`, `STORAGE_DRIVER=memory`, `SEED_*`).

**Interfaces:**
- Produces:
  - `env: Env` from `lib/server/env.ts`: today's schema minus `PORT`, `ADMIN_ORIGIN`, `WEB_URL`, `REVALIDATE_SECRET`; `NEXT_PUBLIC_SITE_URL` optional URL.
  - `prisma: PrismaClient` singleton (cached on `globalThis` outside production).
  - `class ApiException extends Error { constructor(readonly status: number, readonly code: string, message: string, readonly fields?: Record<string, string>, readonly details?: unknown) }` and factories `badRequest(code, message, details?)`, `unauthorized(message = 'Please sign in again')`, `forbidden(message)`, `notFound(message = 'Record not found')`, `conflict(code, message, details?)`, `tooManyRequests(code, message)`, `payloadTooLarge(message)`, `unsupportedMediaType(message)`; `mapError(error: unknown): { status: number; body: ApiEnvelope<null> }` with exactly the filter's table.
  - `type Auth = 'public' | 'user' | 'admin'`; `type RouteContext<P> = { request: Request; url: URL; params: P; user: PublicUser | null }`; `route<P extends Record<string, string> = Record<string, never>>(auth: Auth, handler: (ctx: RouteContext<P>) => unknown | Promise<unknown>, options?: { status?: number }): (request: Request, context: { params: Promise<P> }) => Promise<Response>`; `withMeta<T>(data: T, meta: ApiMeta)`. The wrapper: resolves params, runs `assertSameOrigin` for `MUTATING_METHODS`, resolves `user` via `currentUser` (401 when `auth !== 'public'` and none; 403 when `auth === 'admin'` and role is EDITOR), calls the handler, returns `Response.json(ok(data[, meta]), { status })`; a handler may return a `Response` directly (login/logout set cookies that way); errors go through `mapError`.
  - `parseBody<T>(request: Request, schema: ZodType<T>): Promise<T>` (non-JSON or non-object → `badRequest('BAD_REQUEST', 'Body must be a JSON object')`), `parseQuery<T>(url: URL, schema: ZodType<T>): T`, `queryRecord(url: URL): Record<string, string>`.
  - `SESSION_COOKIE`, `signSession(userId: string): Promise<string>`, `verifySession(token: string): Promise<{ sub: string } | null>`, `readSessionCookie(request: Request): string | null`, `sessionSetCookie(token: string): string`, `sessionClearCookie(): string` (Set-Cookie header values with the constraint attributes).
  - `currentUser(request): Promise<PublicUser | null>` (null for missing/invalid/expired token, unknown or disabled user), `requireUser(request, role?: Role): Promise<PublicUser>`.
  - `assertSameOrigin(request: Request): void` — throws `forbidden` with code `BAD_ORIGIN` when `Origin` is present and `!== new URL(request.url).origin`.
  - `clientIp(request: Request): string` honouring `TRUST_PROXY` hops of `x-forwarded-for`, fallback `'unknown'`.
  - `assertLoginAllowed(ip: string): Promise<void>` (429 `RATE_LIMITED`), `recordLoginFailure(ip): Promise<void>` (atomic upsert within the 60 s window), `resetLoginThrottle(ip): Promise<void>`; `LOGIN_THROTTLE = { limit: 5, ttl: 60_000 }`.
  - `login(email, password): Promise<{ token: string; user: PublicUser }>` (argon2 verify, `lastLoginAt` update, same error codes as today).
  - `revalidateSite(tags: string[]): void` → `revalidateTag(tag, { expire: 0 })` for each unique tag; swallows and logs errors.
  - Test harness: `call(method: string, path: string, init?: { body?: unknown; form?: FormData; cookie?: string; headers?: Record<string, string> }): Promise<{ status: number; body: any; headers: Headers }>` (resolves `app/api/**/route.ts` by segments, builds `new Request('http://localhost' + path, …)`, passes `{ params: Promise.resolve(params) }`); `authedClient(getCookie: () => string)` with `get/post/put/patch/del(path, body?)`; `loginAs(email, password): Promise<string>` returning the cookie value; `seedUser`, `TEST_PASSWORD`, `migrateTestDb`, `resetDb` ported.

- [ ] **Step 1: Write the failing tests for errors, parse, route wrapper, session, current user, origin, client IP, throttle**

Key assertions, in addition to the ported filter spec:

```ts
// route.test.ts
it('rejects a mutating request from another origin with 403 BAD_ORIGIN')
it('allows a mutating request with no Origin header')
it('returns 401 UNAUTHORIZED for auth=user without a cookie and 403 FORBIDDEN for auth=admin with an EDITOR')
it('wraps a plain return in the ok envelope and withMeta in ok(data, meta)')
it('passes through a Response returned by the handler (cookies intact)')
// parse.test.ts
it('maps a non-JSON body to 400 BAD_REQUEST and a non-object JSON body to 400 BAD_REQUEST')
// current-user.test.ts
it('returns null for a valid token whose user is disabled or missing')
// login-throttle.test.ts (database)
it('allows five failures then rejects the sixth within 60 s and allows again after the window')
// client-ip.test.ts
it('takes the nth-from-right x-forwarded-for hop for TRUST_PROXY=n and ignores the header at 0')
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run --project server` → fails on missing modules.

- [ ] **Step 3: Implement the modules listed in Interfaces, the migration, the three auth routes and health**

`login/route.ts`: `route('public', async ({ request }) => { … })` returning `Response.json(ok({ user }), { headers: { 'set-cookie': sessionSetCookie(token) } })` after `assertLoginAllowed(ip)`; on auth failure `recordLoginFailure(ip)` then rethrow; on success `resetLoginThrottle(ip)`. `logout/route.ts`: `route('user', …)` returning `{ loggedOut: true }` with the clear cookie. `me/route.ts`: `route('user', ({ user }) => user)`. `health/route.ts`: `route('public', () => ({ status: 'ok' }))` (same body as today).

- [ ] **Step 4: Port `apps/api/test/auth.e2e-spec.ts` and `health.e2e-spec.ts` to `tests/api/{auth,health}.spec.ts` through `authedClient`; run the server project**

Run: `pnpm vitest run --project server` → all pass; `pnpm db:seed` against `arthouz_dev` exits 0 (idempotent skip). Run: `pnpm exec prisma migrate dev --name login_attempts` once against `arthouz_dev` (creates the migration file), then `migrateTestDb` applies it in tests.

- [ ] **Step 5: Commit**

```bash
git add lib/server app/api/health app/api/auth prisma tests/api vitest.config.ts vitest.setup.server.ts
git commit -m "feat(server): http wrapper, session auth, login throttle and test harness"
```

---

### Task 3: Exhibitions, exhibition works and artworks

**Files:**
- Create: `lib/server/exhibitions/{exhibitions.service,exhibitions.mapper,exhibition-works.service,exhibition-status}.ts` (from `apps/api/src/exhibitions`), `lib/server/artworks/{artworks.service,artworks.mapper}.ts`, routes `app/api/exhibitions/route.ts`, `app/api/exhibitions/publish/route.ts`, `app/api/exhibitions/[id]/route.ts`, `app/api/exhibitions/[id]/{publish,artists,works}/route.ts`, `app/api/exhibitions/[id]/works/{import,order}/route.ts`, `app/api/works/[workId]/route.ts`, `app/api/artworks/[id]/route.ts`, `app/api/artworks/[id]/publish/route.ts`, `app/api/artists/[artistId]/artworks/route.ts`, `app/api/artists/[artistId]/artworks/order/route.ts`.
- Test: ported `*.spec.ts` → `*.test.ts` beside the services; `tests/api/{exhibitions,artworks,exhibitions-by-artist}.spec.ts`.

**Interfaces:**
- Consumes: Task 2 (`route`, `parseBody`, `parseQuery`, `withMeta`, `prisma`, `ApiException` factories, `revalidateSite`, `assertMediaExists`, `uniqueSlug`, `assertExactOrder`, `parsePagination`).
- Produces: `exhibitionsService` and `artworksService` plain-object exports with the same method names as the Nest services; `toExhibitionDto` etc. unchanged names.

- [ ] **Step 1: Port the three database specs first and run them** — Run: `pnpm vitest run --project server tests/api/exhibitions.spec.ts` → fails (no routes).
- [ ] **Step 2: Port services and mappers** — replace `@Injectable` classes with modules; `NotFoundException` → `notFound()`, `BadRequestException({code,message})` → `badRequest(code, message)`, `ConflictException` → `conflict(code, message, details)`, `this.revalidate.trigger(tags)` → `revalidateSite(tags)`; keep every rule (date validation, status override, works guard, import from artworks, exact order).
- [ ] **Step 3: Write the route files** — one `export const GET/POST/PATCH/PUT/DELETE = route(...)` per method; `auth: 'user'` for all; status 200 on delete with `{ id }` as today.
- [ ] **Step 4: Port the unit specs; run the project** — Run: `pnpm vitest run --project server` → pass.
- [ ] **Step 5: Commit** — `git add lib/server/exhibitions lib/server/artworks app/api/exhibitions app/api/works app/api/artworks app/api/artists tests/api && git commit -m "feat(api): exhibitions, works and artworks routes"`

---

### Task 4: Artists

**Files:** `lib/server/artists/*` (service, mapper, related-tags), routes `app/api/artists/route.ts`, `app/api/artists/featured-order/route.ts`, `app/api/artists/[id]/route.ts`, `app/api/artists/[id]/{feature,publish}/route.ts`; `tests/api/artists.spec.ts`; ported unit tests.

**Interfaces:** Consumes Task 2. Note: `app/api/artists/[artistId]/artworks` belongs to Task 3; both tasks create files under `app/api/artists` in different subfolders, so the merge is clean.

- [ ] Steps as Task 3 (spec first → services → routes → unit tests → commit `feat(api): artists routes`).

---

### Task 5: Fairs, services and news

**Files:** `lib/server/{fairs,services,news}/*`, routes `app/api/{fairs,services,news}/route.ts`, `[id]/route.ts`, `[id]/publish/route.ts`, `app/api/{fairs,services}/order/route.ts`; `tests/api/{fairs,services,news}.spec.ts`; ported unit tests.

- [ ] Steps as Task 3; commit `feat(api): fairs, services and news routes`.

---

### Task 6: Locations, settings and users

**Files:** `lib/server/{locations,settings,users}/*`, routes `app/api/locations/route.ts`, `[id]/route.ts`, `order/route.ts`; `app/api/settings/route.ts`, `[key]/route.ts`; `app/api/users/route.ts`, `[id]/route.ts`; `tests/api/{locations,settings,users}.spec.ts`; ported unit tests.

**Interfaces:** `settings` and `users` routes use `auth: 'admin'` exactly where the Nest controllers used `@Roles('ADMIN')` (read the controllers; editors may read settings today). Users keep `SELF_LOCKOUT` and `LAST_ADMIN` rules; `settingsService.get(key)` is consumed by Task 8's public layer.

- [ ] Steps as Task 3; commit `feat(api): locations, settings and users routes`.

---

### Task 7: Media

**Files:**
- Create: `lib/server/media/{media.service,media.constants,image.service,video-signature,media.usage,rehome,upload-slots}.ts`, `lib/server/media/storage/{storage.interface,memory.storage,r2.storage,storage.provider}.ts`, routes `app/api/media/route.ts` (GET list, POST upload with `export const maxDuration = 600`), `app/api/media/[id]/route.ts`; `prisma/rehome-media.ts` updated imports; ported unit tests; `tests/api/media.spec.ts` (multipart via `FormData` + `Blob` through `call(..., { form })`).

**Interfaces:**
- Consumes Task 2. `findMediaUsage(prisma, id)` keeps today's signature (counts services, settings, etc.).
- `POST /api/media`: `const form = await request.formData()`; `file = form.get('file')` must be a `File`; reject unsupported MIME with 415, size over the kind's limit with 413 **before** reading bytes into sharp or storage (check `file.size`), acquire an upload slot (429 `TOO_MANY_UPLOADS` when `MAX_CONCURRENT_UPLOADS` are busy) and release it in `finally`.
- Storage provider picks `R2Storage.fromEnv(env)` or `MemoryStorage` from `env.STORAGE_DRIVER`; memory storage is a module singleton so tests can inspect it.

- [ ] **Step 1: Port `media.e2e-spec.ts` plus two new cases** — `it('rejects a 26 MB image with 413 without touching storage')`, `it('releases the concurrency slot after a rejected upload')`. Run → fail.
- [ ] **Step 2: Port services, storage drivers, image/video helpers, usage, rehome; write routes.**
- [ ] **Step 3: Port unit tests; run the project** → pass.
- [ ] **Step 4: Commit** — `git add lib/server/media app/api/media prisma/rehome-media.ts tests/api/media.spec.ts && git commit -m "feat(api): media routes with server-side uploads"`

---

### Task 8: Public reads and search (after Tasks 3–7 are merged)

**Files:** `lib/server/public/{public.service,home.service,search.service,public.mapper,public.images,public.queries,public.settings,public.constants}.ts`, routes `app/api/public/{home,about,settings,locations,exhibitions,artists,fairs,news,services,search}/route.ts`, `app/api/public/{exhibitions,artists,services}/[slug]/route.ts`; `tests/api/public.spec.ts`; ported unit tests.

**Interfaces:**
- Produces `publicReads` with named loaders used by Task 9: `getHome()`, `getAbout()`, `getSettings()`, `getLocations()`, `getExhibitions(query: PublicExhibitionsQuery)`, `getExhibition(slug)`, `getArtists(query)`, `getArtist(slug)`, `getFairs()`, `getNews()`, `getServices()`, `getService(slug)`, `search(q)`. Each returns the already-mapped public DTO (the same JSON the route returns as `data`). Route handlers call these loaders and add the public cache-control header the interceptor sets today (`public.constants`).

- [ ] Steps as Task 3; commit `feat(api): public reads and search routes`.

---

### Task 9: Site data layer over the public services; visual and a11y harness on one server

**Files:**
- Modify: `lib/api.ts` (keep exports; `apiGet` and `apiGetUncached` resolve `path` through `lib/public-paths.ts`), `tests/unit/lib/api.test.ts` (adapt), `playwright.config.ts` (one `webServer`), `tests/visual/{env,paths,global-setup}.ts`, `tests/a11y/*` URLs, `tests/visual/harness.ts` if it references the API port.
- Create: `lib/public-paths.ts` — `resolvePublicPath(path: string): () => Promise<unknown>`: a table of patterns (`/public/home`, `/public/exhibitions?status=…`, `/public/exhibitions/:slug`, `/public/artists?…`, `/public/artists/:slug`, `/public/fairs`, `/public/news`, `/public/services`, `/public/services/:slug`, `/public/locations`, `/public/settings`, `/public/about`, `/public/search?q=`) → `publicReads` calls with parsed query; unknown path → `ApiError('NOT_FOUND', …, 404)`.
- Delete: `app/api/revalidate/route.ts` and its unit test.

**Interfaces:**
- `apiGet(path, schema, tags)` = `unstable_cache(loader, [path], { tags, revalidate: REVALIDATE_SECONDS })()` then the same Zod validation and `ApiError` mapping (a thrown `ApiException` 404 from the loader becomes `ApiError('NOT_FOUND', message, 404)` so `notFound()` pages keep working). `apiGetUncached(path, schema)` = loader without cache. `connection()` fallback stays for loader failures.

- [ ] **Step 1: Update `tests/unit/lib/api.test.ts`** — assert `apiGet('/public/services/x', schema, tags)` calls `publicReads.getService('x')` (mock `@/lib/server/public`), caches by path with the given tags, maps a 404 `ApiException` to `ApiError` 404 and an invalid payload to `INVALID_RESPONSE`. Run → fail.
- [ ] **Step 2: Implement `lib/public-paths.ts` and the new `lib/api.ts`; remove `API_URL` reads and the revalidate route.**
- [ ] **Step 3: Harness** — `webServer`: `pnpm exec prisma migrate deploy && pnpm exec tsx prisma/seed.ts && pnpm exec next build && pnpm exec next start --port 3100` with env `DATABASE_URL=…arthouz_next_test_web`, `STORAGE_DRIVER=memory`, `TODAY_OVERRIDE`, `JWT_SECRET`, `SEED_*`, `NEXT_PUBLIC_SITE_URL=http://localhost:3100`, `NEXT_IMAGE_UNOPTIMIZED=1`, `ALLOW_TEST_OVERRIDES=1`. Global setup probes `http://localhost:3100/api/public/locations`; `setArtistIndexLayout` logs in at `/api/auth/login` and PUTs `/api/settings/artistIndexLayout` (same as today, new base).
- [ ] **Step 4: Run** — `pnpm test` (site + server projects) → pass; `pnpm test:visual && pnpm test:a11y` → all pass, max diff ≤ 0.005. Attach the harness summary line to the report.
- [ ] **Step 5: Commit** — `git add lib/api.ts lib/public-paths.ts tests playwright.config.ts app/api && git commit -m "feat(web): read public data in-process through the tagged cache"`

---

### Task 10: Mount the CMS at /admin

**Files:**
- Create: `admin/AdminApp.tsx` (client component: providers + `RouterProvider` with `createBrowserRouter(routes, { basename: '/admin' })`), `app/admin/layout.tsx` (metadata `robots: { index: false }`, icons from `public/admin/*`, `next/font/google` for EB Garamond 400/500/400i, Space Grotesk 400/500/600, Noto Serif Tamil 400/500 exposed as CSS variables, wrapper `<div className="admin-root">`), `app/admin/[[...slug]]/page.tsx` (`dynamic(() => import('@/admin/AdminApp'), { ssr: false })`), `styles/admin.css` (admin base rules from `admin/styles/app.css` scoped under `.admin-root`, font tokens overridden there), `playwright.e2e.config.ts`, `public/admin/{favicon.svg,favicon-32.png,apple-touch-icon.png}` (moved from `apps/admin/public`).
- Modify: `styles/tokens.css` (add the 45 admin-only tokens to `@theme`), `admin/lib/api.ts` (`API_URL = '/api'`), `admin/app/Sidebar.tsx` (`publicSiteUrl` → `'/'` constant), `admin/features/exhibitions/types.ts` (replace its `import.meta.env` read), `admin/test/msw.ts` (`API_URL = 'http://localhost/api'`), `admin/app/*.test.tsx` that build memory routers (unchanged if they pass `routes`), `vitest.config.ts` (`admin` project: jsdom, `admin/**/*.test.{ts,tsx}`, setup `admin/test/setup.ts`, `css: false`, coverage include `admin/**` excluding tests, `AdminApp.tsx`), `tests/e2e/fixtures.ts` + `publish-flow.spec.ts` (URLs: admin `http://localhost:3102/admin`, API `http://localhost:3102/api`, web `http://localhost:3102`), `eslint.config.mjs` (admin rules for `admin/**`).
- Delete: `admin/main.tsx`, `admin/vite-env.d.ts`, `apps/admin/index.html`.

**Interfaces:** `RequireAuth` keeps redirecting to `/login?next=<basename-relative path>`; React Router's basename makes `/admin/exhibitions/<id>` → `next=/exhibitions/<id>`.

- [ ] **Step 1: Add the deep-link case to `tests/e2e/publish-flow.spec.ts`** — `test('a signed-out deep link returns to the editor after login')`: visit `/admin/exhibitions/<seeded id>`, expect URL `/admin/login?next=%2Fexhibitions%2F<id>`, log in, expect the editor heading. Run the e2e config → fails (nothing mounted).
- [ ] **Step 2: Build the mount, layout, styles merge, fonts, favicons; fix env reads; vitest admin project.**
- [ ] **Step 3: Run** — `pnpm vitest run --project admin` → 282 pass; `pnpm test:visual` → still ≤ 0.005 (token merge must not move a site pixel); `pnpm test:e2e` (3102 server: schema reset, migrate, seed, build, start) → pass. Save screenshots of `/admin` dashboard and `/admin/exhibitions` at 1440 and 390 to the scratchpad and list their paths in the report.
- [ ] **Step 4: Commit** — `git add admin app/admin styles public/admin vitest.config.ts playwright.e2e.config.ts tests/e2e eslint.config.mjs && git commit -m "feat(admin): mount the CMS under /admin"`

---

### Task 11: Teardown, docs and full verify

**Files:**
- Delete (git rm -r): `apps/`, `packages/`, root `.superpowers/` references to the old layout are left alone (ignored), old `apps/*/.env` files are not tracked.
- Modify: `package.json` (drop any dependency now unused: `tsup`, `vite`, Nest, Jest, supertest, passport, express types; confirm with `pnpm why`), `README.md` (single-app run book: dev 3300, `/admin`, `/api`, env table, pm2 and Vercel notes, presigned-upload follow-up), `.env.example`, `docs/superpowers/specs/2026-10-30-arthouz-cms-design.md` (one note at the top pointing to the single-app spec), `prisma/seed.ts` imports if any still point at `apps/`.
- Create: `tests/unit/lib/public-paths.test.ts` if Task 9 did not reach 80 % on `lib/public-paths.ts`.

- [ ] **Step 1: Remove the old trees and dead dependencies; `pnpm install`.**
- [ ] **Step 2: Run `pnpm verify`** → typecheck, lint, three coverage projects ≥ 80 %, API specs, visual + a11y, e2e all pass. Record the counts.
- [ ] **Step 3: Write the README and `.env.example`; commit** — `git add -A && git commit -m "chore: remove the monorepo packages and document the single app"`.
- [ ] **Step 4: Final whole-branch review** (Opus, three areas: server + routes, site data layer + harness, admin mount + styles) against the spec; fix Important findings; re-run `pnpm verify`.
