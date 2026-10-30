# Art Houz Website + CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a pixel-faithful Next.js port of the Art Houz prototype that renders content from a NestJS + PostgreSQL API, plus a React CMS where staff edit that content and images (Cloudflare R2).

**Architecture:** pnpm monorepo with four workspaces. `packages/shared` owns Zod schemas, formatting and status rules used by all apps. `apps/api` (NestJS + Prisma) exposes cookie-authenticated admin CRUD and read-only `/public/*` endpoints and triggers Next cache revalidation on every write. `apps/web` (Next.js App Router) fetches `/public/*` with cache tags and reproduces the prototype's inline styles as Tailwind utilities over a token file. `apps/admin` (Vite + React) is a separate SPA on its own origin.

**Tech Stack:** Node 22, pnpm 10, TypeScript 5, Zod 4, NestJS 11, Prisma 7, PostgreSQL 16 (`pg_trgm`), argon2, `@nestjs/throttler`, `@aws-sdk/client-s3` (R2), sharp, Next.js 16 + React 19 + Tailwind 4 + `next/font`, Vite 7 + React 19 + Tailwind 4 + react-router 7 + TanStack Query 5 + TanStack Table 8 + React Hook Form 7, Vitest, Playwright, pixelmatch, axe-core.

**Spec:** `docs/superpowers/specs/2026-10-30-arthouz-cms-design.md`

## Global Constraints

- Stack is fixed: React, NestJS, PostgreSQL, Tailwind CSS. Public site is Next.js 16 (App Router). Admin is Vite + React.
- Dev ports: web `3100`, admin `5180`, api `4100`. Never 3000/3001/4000/5000/5173/5174.
- R2 env names exactly: `S3_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_S3_PUBLIC_URL`; S3 client `region: 'auto'`. Object keys `arthouz/YYYY/MM/<uuid>.<ext>`.
- Upload limits: 25 MB; mime allowlist `image/jpeg`, `image/png`, `image/webp`, `image/avif`. Thumbnail 480 px wide WebP.
- Auth: argon2id, JWT in httpOnly `SameSite=Lax` cookie named `ah_session`, 7-day expiry, roles `ADMIN` | `EDITOR`, login throttle 5 per 60 s per IP, `Origin` check on mutating requests.
- Public endpoints return only `isPublished = true` rows (locations, about sections and settings are always live).
- Roles: `EDITOR` = all content, media, ordering, publish and delete; `ADMIN` = editor + `/users` + `PUT /settings/*`.
- Exhibition works are `ExhibitionWork` rows (own image + caption, optional `artworkId` source); artist pages show `Artwork` rows only.
- Ordering rules: artists by `sortName` with collation `en-x-icu`; news by `publishedAt desc, createdAt desc`; home press = 3 latest; "Read article ↗" only when `externalUrl` is set. The visual harness normalises the reference copy to these rules (Task 11).
- Test-only env: `TODAY_OVERRIDE=YYYY-MM-DD` (api) and `NEXT_IMAGE_UNOPTIMIZED=1` (web), both ignored when `NODE_ENV=production`. Visual runs use `TODAY_OVERRIDE=2026-10-30`.
- Production: admin and API are same-site (cookie auth); separate R2 bucket for Art Houz.
- Exhibition status derived in `Asia/Kolkata`, inclusive of start and end dates; `statusOverride` wins; `datesLabel` prints verbatim when set.
- Prototype tokens are the only colours allowed in `apps/web`: paper `#EDEAE4`, ink `#161513`, amber `#D98A2B`, rust `#B4651A`, body `#3B3833`, muted `#5E5A54`, faint `#8A857D`, ondark `#C9C4BB`, meta `#A8A39A`, imgph `#D8D3CA`. Hairlines `rgba(22,21,19,0.12|0.14|0.16|0.18|0.3)` and `rgba(237,234,228,0.16|0.18|0.2)`. Fonts EB Garamond 400/500/italic 400, Space Grotesk 400/500/600, Noto Serif Tamil 400/500. Header 76 px, mobile header below 880 px, container 1440 px with `clamp(20px,4vw,56px)` gutters.
- Visual acceptance: each public screen diffs against the prototype at 375/768/1024/1440 with ≤ 0.5 % differing pixels and ≤ 4 px height delta.
- API responses always `{ ok, data, error, meta }`. Validation errors carry `error.fields` keyed by field name.
- Coding rules from `~/.claude/rules`: immutable updates, files < 400 lines typical, named constants, Zod at every boundary, no native dialogs in UI, no filler helper copy, commits `<type>: <description>` with no attribution trailers.
- 80 % coverage per app (`vitest --coverage` / `jest --coverage` thresholds set in config).

## Review Focus

1. Tamil news titles (e.g. `நான் யார்…`) must be searchable with `ILIKE` and must render in Noto Serif Tamil on the public site; test pinned in Task 10 (search) and Task 15 (font stack assertion).
2. An exhibition whose `endDate` precedes `startDate` must be rejected with a field error on `endDate`, not saved; test in Task 6.
3. Deleting an artist referenced by an exhibition or owning artworks must be refused with a 409 listing the references; test in Task 7.
4. Two exhibitions with the same title must get distinct slugs (`-2` suffix) rather than a 500; test in Task 6.
5. Home when nothing is "now on view" and no hero override: hero falls back to the most recent exhibition and the upcoming band is omitted when nothing is upcoming; tests in Task 10.

## Execution waves

Tasks inside a wave touch disjoint files and may run in parallel. Each wave starts only when the previous one is merged.

| Wave | Tasks |
|---|---|
| 1 | 1 |
| 2 | 2 |
| 3 | 3, 4, 5 |
| 4 | 6, 7, 8, 9 |
| 5 | 10 |
| 6 | 11, 17 |
| 7 | 12, 18 |
| 8 | 13, 14, 15, 19, 20, 21 |
| 9 | 16, 22 |
| 10 | 23, 24 |

---

## Phase 0: Foundation

### Task 1: Monorepo + `packages/shared`

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.nvmrc` (`22`), `.gitignore`, `tsconfig.base.json`, `.editorconfig`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/vitest.config.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/format/dates.ts`, `packages/shared/src/format/status.ts`, `packages/shared/src/format/slug.ts`, `packages/shared/src/format/letters.ts`
- Create: `packages/shared/src/schemas/common.ts`, `exhibition.ts`, `artist.ts`, `artwork.ts`, `fair.ts`, `news.ts`, `location.ts`, `media.ts`, `settings.ts`, `user.ts`, `auth.ts`, `public.ts`
- Create: `packages/shared/src/api/envelope.ts`, `packages/shared/src/api/tags.ts`
- Test: `packages/shared/test/dates.test.ts`, `status.test.ts`, `slug.test.ts`, `letters.test.ts`, `schemas.test.ts`, `tags.test.ts`

**Interfaces:**
- Produces (all exported from `@arthouz/shared`):
  - `type ExhibitionStatus = 'CURRENT' | 'UPCOMING' | 'PAST'`; `type ExhibitionType = 'SOLO' | 'GROUP'`; `type Role = 'ADMIN' | 'EDITOR'`
  - `deriveExhibitionStatus(start: Date, end: Date, today: Date): ExhibitionStatus`
  - `resolveExhibitionStatus(e: { startDate: Date; endDate: Date; statusOverride: ExhibitionStatus | null }, today?: Date): ExhibitionStatus`
  - `todayInKolkata(now?: Date): Date` (date at 00:00 in `Asia/Kolkata`); the API wraps it as `today()` honouring `TODAY_OVERRIDE` outside production
  - `formatDateRange(start: Date, end: Date): string` → `October 3 – November 22, 2026` (same year) / `December 14, 2024 – January 30, 2025` (different years); en dash with spaces
  - `formatMonthYear(d: Date): string` → `February 2024`
  - `slugify(s: string): string` (lowercase, non-alphanumerics to `-`, trimmed)
  - `indexLetter(sortName: string): string` (first char uppercased; non A–Z → `#`)
  - `STATUS_BADGE: Record<ExhibitionStatus, { label: string; bg: string; fg: string; line: string }>` with values `CURRENT → ['Now on view','#D98A2B','#161513','#D98A2B']`, `UPCOMING → ['Upcoming','#161513','#EDEAE4','#161513']`, `PAST → ['Past','transparent','#5E5A54','rgba(22,21,19,0.3)']`
  - Input schemas (Zod 4): `exhibitionInputSchema`, `exhibitionWorkInputSchema` (`{ imageId, title, year, artistId, medium }`), `artistInputSchema`, `artworkInputSchema`, `fairInputSchema`, `newsInputSchema`, `locationInputSchema`, `mediaPatchSchema`, `userInputSchema`, `loginSchema`, `publishSchema` (`{ isPublished: boolean }`), `reorderSchema` (`{ ids: string[] }`); each exports its inferred type `ExhibitionInput` etc. Field lists are exactly spec section 6; `exhibitionInputSchema` refines `endDate >= startDate` with the message `End date must be on or after the start date` on path `endDate`.
  - `SETTING_KEYS` tuple: `heroLayout`, `artistIndexLayout`, `homeHeroExhibitionId`, `homeArtistCount`, `homeFocus`, `about.gallery`, `about.proprietor`, `about.services`, `about.publications`, `footer`, `site`; `settingSchemas: { [K in SettingKey]: ZodType }`; `SETTING_DEFAULTS` (`heroLayout: 'FULL_BLEED'`, `artistIndexLayout: 'GROUPED'`, `homeArtistCount: 22`, others `null` or empty strings)
  - Public output schemas: `publicExhibitionSchema`, `publicExhibitionDetailSchema`, `publicArtistSchema`, `publicArtistDetailSchema`, `publicFairSchema`, `publicNewsSchema`, `publicLocationSchema`, `publicHomeSchema`, `publicAboutSchema`, `publicSettingsSchema`, `publicSearchSchema`, and inferred types `PublicExhibition` etc. Public exhibition includes `status`, `statusLabel`, `datesLabel` (resolved string), `artistLine`, `image: PublicImage | null` where `PublicImage = { url, thumbUrl, width, height, alt }`.
  - `type ApiEnvelope<T> = { ok: boolean; data: T | null; error: { code: string; message: string; fields?: Record<string, string> } | null; meta?: { total: number; page: number; limit: number } }`; `ok<T>(data, meta?)`, `fail(code, message, fields?)`
  - `tagsFor(entity: 'exhibition' | 'artist' | 'artwork' | 'fair' | 'news' | 'location' | 'setting' | 'media', slug?: string): string[]` → always includes `home` and `search`; `exhibition` adds `exhibitions`, `exhibition:<slug>` and `artists` (artist pages list exhibitions); `artist`/`artwork` add `artists`, `artist:<slug>`, `exhibitions`; `fair` → `fairs`; `news` → `news`, `exhibitions`; `location` → `locations`, `about`; `setting` → `settings`, `about`, `artists`.

- [ ] **Step 1: Initialise the repo and workspace**

Run in `~/Documents/arthouz`: `git init -b main`, write `pnpm-workspace.yaml` with `packages: ['apps/*', 'packages/*']`, root `package.json` scripts `dev`, `build`, `test`, `lint`, `typecheck` delegating with `pnpm -r --parallel` / `pnpm -r`. `.gitignore` covers `node_modules`, `dist`, `.next`, `.env*` except `.env.example`, `coverage`, `test-results`, `mockups/**/*.png`.

- [ ] **Step 2: Write the failing tests**

```ts
// dates.test.ts
test('same-year range prints month day – month day, year', () =>
  expect(formatDateRange(new Date('2026-10-03'), new Date('2026-11-22'))).toBe('October 3 – November 22, 2026'))
test('cross-year range repeats the year', () =>
  expect(formatDateRange(new Date('2024-12-14'), new Date('2025-01-30'))).toBe('December 14, 2024 – January 30, 2025'))
test('month-year', () => expect(formatMonthYear(new Date('2024-02-02'))).toBe('February 2024'))
// status.test.ts
test('inclusive on end date', () => expect(deriveExhibitionStatus(d('2026-10-03'), d('2026-11-22'), d('2026-11-22'))).toBe('CURRENT'))
test('upcoming before start', () => …toBe('UPCOMING'))
test('override wins', () => expect(resolveExhibitionStatus({ startDate, endDate, statusOverride: 'PAST' }, today)).toBe('PAST'))
test('todayInKolkata rolls the date at 18:30Z', () => expect(todayInKolkata(new Date('2026-10-30T18:30:00Z')).toISOString()).toBe('2026-10-31T00:00:00.000Z'))
// slug.test.ts
test('matches prototype slugs', () => { expect(slugify("By Nature's Force: Veli Vetridamakha Nagarkirathu")).toBe('by-nature-s-force-veli-vetridamakha-nagarkirathu'); expect(slugify('K.M. Adimoolam')).toBe('k-m-adimoolam') })
// letters.test.ts
test('K.M. Adimoolam → K; 2 → #', …)
// schemas.test.ts
test('exhibitionInputSchema rejects end before start on endDate', () => { const r = exhibitionInputSchema.safeParse({ …valid, startDate: '2026-11-22', endDate: '2026-10-03' }); expect(r.success).toBe(false); expect(r.error.issues[0].path).toEqual(['endDate']) })
test('settingSchemas.heroLayout accepts FULL_BLEED|SPLIT only', …)
test('newsInputSchema accepts Tamil title and optional externalUrl', …)
// tags.test.ts
test('exhibition tags', () => expect(tagsFor('exhibition', 'tidewater')).toEqual(expect.arrayContaining(['home', 'search', 'exhibitions', 'exhibition:tidewater', 'artists'])))
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @arthouz/shared test`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement the modules listed in Interfaces**

`todayInKolkata` uses `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })` to get `YYYY-MM-DD`, returns `new Date(`${ymd}T00:00:00.000Z`)`. Dates in schemas are `z.coerce.date()`; `datesLabel`, `statusOverride`, `born`, `externalUrl`, `exhibitionId` are nullable/optional. `homeFocus` schema: `{ artistId: string | null, text: string, imageId: string | null, mediumLabel: string, baseLabel: string }`. `footer`: `{ tagline, instagramUrl, facebookUrl, copyrightFrom: number }`. `site`: `{ title, description, ogImageId }`. `about.*` schemas carry exactly the fields the mock `about.html` shows: gallery `{ statement, body, locationsLabel, imageId }`, proprietor `{ eyebrow, name, quote, body, imageId }`, services `{ title, body, ctaLabel, imageId }`, publications `{ title, body, externalUrl, imageId }`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @arthouz/shared test -- --coverage`
Expected: PASS, coverage ≥ 80 %.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold monorepo and shared schemas"
```

---

## Phase A: API

### Task 2: API scaffold, Prisma schema, envelope, module skeletons

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/nest-cli.json`, `apps/api/jest.config.ts`, `apps/api/test/jest-e2e.config.ts`, `apps/api/.env.example`
- Create: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/*` (via `prisma migrate dev --name init`)
- Create: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/config/env.ts`
- Create: `apps/api/src/common/prisma.service.ts`, `apps/api/src/common/envelope.interceptor.ts`, `apps/api/src/common/http-exception.filter.ts`, `apps/api/src/common/zod-body.pipe.ts`, `apps/api/src/common/pagination.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create empty module files for later tasks, each registered in `app.module.ts`: `auth/auth.module.ts`, `users/users.module.ts`, `media/media.module.ts`, `exhibitions/exhibitions.module.ts`, `artists/artists.module.ts`, `artworks/artworks.module.ts`, `fairs/fairs.module.ts`, `news/news.module.ts`, `locations/locations.module.ts`, `settings/settings.module.ts`, `public/public.module.ts`, `revalidate/revalidate.module.ts`
- Test: `apps/api/test/health.e2e-spec.ts`, `apps/api/test/helpers/app.ts`, `apps/api/test/helpers/db.ts`

**Interfaces:**
- Consumes: `ApiEnvelope`, `ok`, `fail` from `@arthouz/shared`.
- Produces:
  - `env` object from `config/env.ts` validated by Zod at boot: `PORT=4100`, `DATABASE_URL`, `JWT_SECRET` (min 32 chars), `ADMIN_ORIGIN`, `WEB_URL`, `REVALIDATE_SECRET`, `STORAGE_DRIVER` (`r2` | `memory`), the five R2 vars (required when `r2`), `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `TODAY_OVERRIDE?`; `config/clock.ts` exports `today(): Date` = `TODAY_OVERRIDE` parsed when set and `NODE_ENV !== 'production'`, else `todayInKolkata()`.
  - `PrismaService extends PrismaClient` (global).
  - `EnvelopeInterceptor` wraps every controller return as `ok(data)`; if the handler returns `{ data, meta }` tagged with `withMeta()` it becomes `ok(data, meta)`.
  - `HttpExceptionFilter` maps: `ZodError` → 400 `VALIDATION` with `fields` (`path.join('.')` → first message), Prisma `P2002` → 409 `CONFLICT`, `P2025` → 404 `NOT_FOUND`, `HttpException` → its status, anything else → 500 `INTERNAL` (message hidden, logged).
  - `ZodBody(schema)` parameter decorator / pipe.
  - `parsePagination(query): { page: number; limit: number; skip: number }` with limit default 50, max 200.
  - Prisma models exactly per spec section 6, enums `Role`, `ExhibitionType`, `ExhibitionStatus`; join table `ExhibitionArtist(exhibitionId, artistId, sortOrder)` with composite PK; `ExhibitionWork(id, exhibitionId, imageId, title, year, artistId, medium, sortOrder, artworkId?)`; `Setting(key String @id, value Json)`; `Artist.sortName` declared with `@db.VarChar` and the migration adds `COLLATE "en-x-icu"` on that column; `Media` referenced by `heroImageId`, `portraitImageId`, `imageId` with `onDelete: Restrict`.
  - Test helpers: `createTestApp(): Promise<INestApplication>` (applies the same pipes/filters/interceptors as `main.ts`, `STORAGE_DRIVER=memory`), `resetDb()` truncates all tables.

- [ ] **Step 1: Write the failing e2e test**

```ts
it('GET /health returns the envelope', async () => {
  const res = await request(app.getHttpServer()).get('/health').expect(200)
  expect(res.body).toEqual({ ok: true, data: { status: 'ok' }, error: null })
})
it('unknown route returns a 404 envelope', async () => {
  const res = await request(app.getHttpServer()).get('/nope').expect(404)
  expect(res.body.ok).toBe(false); expect(res.body.error.code).toBe('NOT_FOUND')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `createdb arthouz_test && pnpm --filter @arthouz/api test:e2e`
Expected: FAIL (no app).

- [ ] **Step 3: Scaffold Nest, write `schema.prisma`, run `prisma migrate dev --name init` against `arthouz_dev`, implement the common pieces and empty modules**

`main.ts`: `cookie-parser`, CORS `{ origin: [env.ADMIN_ORIGIN, env.WEB_URL], credentials: true }`, global pipe/filter/interceptor, listen on `env.PORT`. `test/helpers/db.ts` runs `prisma migrate deploy` once against `DATABASE_URL_TEST` (default `postgresql://localhost/arthouz_test`).

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @arthouz/api test:e2e`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api pnpm-lock.yaml
git commit -m "feat(api): scaffold nest app, prisma schema and response envelope"
```

### Task 3: Seed from the prototype data

**Files:**
- Create: `apps/api/prisma/seed-data/exhibitions.json`, `artists.json`, `news.json`, `fairs.json`, `locations.json`, `about.json`, `settings.json`, `media.json`
- Create: `apps/api/prisma/seed.ts`, `apps/api/prisma/seed/placeholders.ts`
- Modify: `apps/api/package.json` (`"prisma": { "seed": "tsx prisma/seed.ts" }`, script `db:seed`)
- Test: `apps/api/test/seed.e2e-spec.ts`

**Interfaces:**
- Consumes: `slugify`, `SETTING_DEFAULTS` from shared; `PrismaService`.
- Produces: `seedDatabase(prisma: PrismaClient, opts: { adminEmail: string; adminPassword: string }): Promise<void>`, idempotent (upsert by slug/key). Media rows for every picsum URL the prototype uses: `url = https://picsum.photos/seed/arthouz<first8>/1200/1000`, `thumbUrl = …/480/400`, `width 1200`, `height 1000`, `alt` = the prototype's placeholder caption, `key = seed/<name>`. `placeholders.ts` ports the prototype's `ahHash`/`ahArtist` so artist `medium`, `base`, `born`, `lede`, `bio` match the prototype text exactly; each such artist gets `bio` prefixed with nothing but the seed file carries `"placeholder": true` so the admin can show a "placeholder text" hint later (not in scope to display).

- [ ] **Step 1: Convert the prototype's `AH_*` constants to JSON** (hand conversion from the `<script type="text/x-dc">` block; dates become ISO `startDate`/`endDate`; news `publishedAt` is the first of the month; `Reflections` keeps `datesLabel: "September 14, 2024 – September 30, 2024"`; about copy and footer/settings defaults from the prototype's About section and footer).

- [ ] **Step 2: Write the failing test**

```ts
it('seeds the prototype content idempotently', async () => {
  await seedDatabase(prisma, { adminEmail: 'admin@example.com', adminPassword: 'change-me-now-please' })
  await seedDatabase(prisma, { adminEmail: 'admin@example.com', adminPassword: 'change-me-now-please' })
  expect(await prisma.exhibition.count()).toBe(9); expect(await prisma.artist.count()).toBe(55)
  expect(await prisma.news.count()).toBe(10); expect(await prisma.fair.count()).toBe(4); expect(await prisma.location.count()).toBe(2)
  const tide = await prisma.exhibition.findUnique({ where: { slug: 'tidewater' }, include: { artists: { orderBy: { sortOrder: 'asc' }, include: { artist: true } } } })
  expect(tide.artists.map(a => a.artist.name)).toEqual(['Parvathi Nayar', 'Ranjith Raman', 'P. Gopinath', 'Pradeep Unni'])
  expect((await prisma.setting.findUnique({ where: { key: 'heroLayout' } })).value).toBe('FULL_BLEED')
  expect(await prisma.user.count()).toBe(1)
})
```

- [ ] **Step 3: Run to verify it fails** — `pnpm --filter @arthouz/api test:e2e -t seeds` → FAIL.

- [ ] **Step 4: Implement `seed.ts`** — upserts in dependency order (users → media → artists → artworks → exhibitions → exhibition artists → exhibition works → fairs → news → locations → settings). `Artwork`: each artist's 6 generated works from `placeholders.ts`. `ExhibitionWork`: each exhibition's `works[]` images with the prototype's caption rule (title from `AH_WORKT[(hash(slug)+i) % 12]`, year = last 4 chars of the dates label, artist = `artists[i % artists.length]`, medium = `AH_MAT[artist.medium]`), `artworkId` null.

- [ ] **Step 5: Run to verify it passes**, then `pnpm --filter @arthouz/api db:seed` against dev.

- [ ] **Step 6: Commit** — `git commit -m "feat(api): seed prototype content"`.

### Task 4: Auth and users

**Files:**
- Create: `apps/api/src/auth/auth.controller.ts`, `auth.service.ts`, `jwt.strategy.ts` (cookie extractor), `auth.guard.ts`, `roles.guard.ts`, `roles.decorator.ts`, `current-user.decorator.ts`, `origin.guard.ts`
- Create: `apps/api/src/users/users.controller.ts`, `users.service.ts`
- Modify: `apps/api/src/auth/auth.module.ts`, `apps/api/src/users/users.module.ts`, `apps/api/src/app.module.ts` (ThrottlerModule, global `AuthGuard` with `@Public()` opt-out, global `OriginGuard`)
- Test: `apps/api/test/auth.e2e-spec.ts`, `apps/api/test/users.e2e-spec.ts`, `apps/api/src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `loginSchema`, `userInputSchema`, `Role` from shared.
- Produces: `@Public()` decorator; `@Roles('ADMIN')`; `@CurrentUser()` → `{ id, email, role, name }`; `AuthService.login(email, password): Promise<{ token: string; user: PublicUser }>`; cookie `ah_session` set with `httpOnly, sameSite: 'lax', secure: env.NODE_ENV === 'production', maxAge: 7d, path: '/'`; `OriginGuard` rejects `POST/PUT/PATCH/DELETE` whose `Origin` header is present and not `env.ADMIN_ORIGIN` with 403 `BAD_ORIGIN`; `UsersService` CRUD (`create` hashes password, `disable` sets `isDisabled` — add the column in this task's migration), `GET /auth/me`.

- [ ] **Step 1: Write failing tests** — `login sets ah_session cookie and returns user`; `wrong password → 401 INVALID_CREDENTIALS`; `6th login attempt within a minute → 429`; `GET /auth/me without cookie → 401`; `EDITOR calling POST /users → 403`; `mutating request with foreign Origin → 403 BAD_ORIGIN`; unit: `hashes with argon2id and verifies`.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** using `@nestjs/passport` + `passport-jwt` with a custom extractor reading `req.cookies.ah_session`; `ThrottlerGuard` on the login route with `{ limit: 5, ttl: 60_000 }`.
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(api): cookie auth, roles and users"`.

### Task 5: Media and R2 storage

**Files:**
- Create: `apps/api/src/media/storage/storage.interface.ts`, `storage/r2.storage.ts`, `storage/memory.storage.ts`, `storage/storage.provider.ts`
- Create: `apps/api/src/media/image.service.ts`, `media.service.ts`, `media.controller.ts`, `media.constants.ts`
- Modify: `apps/api/src/media/media.module.ts`
- Test: `apps/api/src/media/image.service.spec.ts`, `apps/api/src/media/storage/r2.storage.spec.ts` (mock `S3Client.send`), `apps/api/test/media.e2e-spec.ts` (fixture images under `apps/api/test/fixtures/`)

**Interfaces:**
- Produces: `interface Storage { put(key: string, body: Buffer, contentType: string): Promise<{ url: string }>; delete(key: string): Promise<void> }`; token `STORAGE`; `R2Storage` builds URL as `${AWS_S3_PUBLIC_URL}/${key}`; `MemoryStorage` keeps a `Map` and returns `memory://<key>`; `ImageService.process(buf: Buffer): Promise<{ width: number; height: number; thumb: Buffer; ext: 'jpg' | 'png' | 'webp' | 'avif' }>` (sharp `rotate()`, thumb `resize({ width: 480 })` → webp q80); `MediaService.upload(file: Express.Multer.File, alt: string, userId: string): Promise<Media>`; `list({ q, page, limit })` searching `key ILIKE` or `alt ILIKE`; `patch(id, { alt, caption })`; `remove(id)` throws 409 `MEDIA_IN_USE` with `details: { usedBy: Array<{ type, id, title }> }` when any FK references it; `usage(id)`.
- Routes: `POST /media` (multipart `file` + `alt`), `GET /media`, `GET /media/:id`, `PATCH /media/:id`, `DELETE /media/:id`. Key format `arthouz/${yyyy}/${mm}/${uuid}.${ext}`, thumb key `…-thumb.webp`.

- [ ] **Step 1: Write failing tests** — unit: `process returns dimensions and a 480-wide webp thumb`; `rejects buffers that are not images`; r2: `put sends PutObjectCommand with Bucket from env and returns public url`. e2e: `uploads a jpeg and returns media with url, thumbUrl, width, height, alt`; `rejects image/heic with 415`; `rejects 26 MB with 413`; `rejects missing alt with 400 fields.alt`; `DELETE used media → 409 MEDIA_IN_USE listing the exhibition title`.
- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement** with `FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 }, fileFilter })`.
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(api): media upload to R2 with thumbnails"`.

### Task 6: Exhibitions module and revalidation

**Files:**
- Create: `apps/api/src/revalidate/revalidate.service.ts`
- Create: `apps/api/src/exhibitions/exhibitions.controller.ts`, `exhibitions.service.ts`, `exhibitions.mapper.ts`, `apps/api/src/common/slugs.ts`
- Modify: `apps/api/src/exhibitions/exhibitions.module.ts`, `apps/api/src/revalidate/revalidate.module.ts`
- Test: `apps/api/src/common/slugs.spec.ts`, `apps/api/src/revalidate/revalidate.service.spec.ts`, `apps/api/test/exhibitions.e2e-spec.ts`

**Interfaces:**
- Consumes: `exhibitionInputSchema`, `publishSchema`, `reorderSchema`, `tagsFor`, `resolveExhibitionStatus`, `formatDateRange`.
- Produces: `RevalidateService.trigger(tags: string[]): void` (fire-and-forget POST to `${WEB_URL}/api/revalidate` with header `x-revalidate-secret`, body `{ tags }`, errors logged not thrown); `uniqueSlug(prisma, model: 'exhibition' | 'artist' | 'fair' | 'news' | 'location', base: string, excludeId?: string): Promise<string>` appending `-2`, `-3`…; `ExhibitionsService` with `list({ status?, city?, published?, q?, page, limit })`, `get(id)`, `create(input, userId)`, `update(id, input)`, `setArtists(id, artistIds)`, `publish(id, isPublished)`, `bulkPublish(ids, isPublished)`, `remove(id)`; `ExhibitionWorksService` (same module, file `works.service.ts` + `works.controller.ts`) with `list(exhibitionId)`, `create(exhibitionId, input)`, `importFromArtwork(exhibitionId, artworkId)` (copies image, title, year, medium, artistId and sets `artworkId`), `update(workId, input)`, `remove(workId)`, `reorder(exhibitionId, ids)`; works' `artistId` must be one of the exhibition's artists (400 `WORK_ARTIST_NOT_IN_EXHIBITION`). Every write calls `revalidate.trigger(tagsFor('exhibition', slug))`. `toAdminExhibition(row)` adds `status`, `statusLabel`, `datesLabel` (resolved).
- Routes: `GET/POST /exhibitions`, `GET/PATCH/DELETE /exhibitions/:id`, `PUT /exhibitions/:id/artists`, `PATCH /exhibitions/:id/publish`, `PATCH /exhibitions/publish` (bulk `{ ids, isPublished }`), `GET/POST /exhibitions/:id/works`, `POST /exhibitions/:id/works/import`, `PUT /exhibitions/:id/works/order`, `PATCH/DELETE /works/:id`.

- [ ] **Step 1: Write failing tests** — `creates with derived slug and status UPCOMING`; `second exhibition titled "Tidewater" gets slug tidewater-2`; `end before start → 400 fields.endDate`; `setArtists stores order`; `work with an artist outside the exhibition → 400 WORK_ARTIST_NOT_IN_EXHIBITION`; `import copies artwork fields and keeps artworkId`; `works order persists`; `bulk publish flips three rows`; `write posts tags to the revalidate URL` (stub `fetch`); unit `uniqueSlug`.
- [ ] **Step 2: Run to verify they fail.**  **Step 3: Implement.**  **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(api): exhibitions crud with ordering, publish and revalidation"`.

### Task 7: Artists and artworks modules

**Files:**
- Create: `apps/api/src/artists/artists.controller.ts`, `artists.service.ts`; `apps/api/src/artworks/artworks.controller.ts`, `artworks.service.ts`
- Modify: the two module files
- Test: `apps/api/test/artists.e2e-spec.ts`, `apps/api/test/artworks.e2e-spec.ts`

**Interfaces:**
- Produces: `ArtistsService.list({ q, letter?, featured?, published?, page, limit })` (sorted by `sortName`), `create`/`update` (sets `sortName = input.sortName || name`), `setFeaturedOrder(artistIds)`, `publish`, `remove` (409 `ARTIST_IN_USE` with `details.exhibitions[]` and `details.artworkCount`); `ArtworksService` nested under artist: `GET/POST /artists/:artistId/artworks`, `PATCH/DELETE /artworks/:id`, `PUT /artists/:artistId/artworks/order`. Routes: `GET/POST /artists`, `GET/PATCH/DELETE /artists/:id`, `PATCH /artists/:id/publish`, `PUT /artists/featured-order`.

- [ ] **Step 1: Write failing tests** — `sortName defaults to name`; `list?letter=K returns only K initials`; `featured-order persists featuredOrder 1..n and sets isFeatured`; `delete artist in an exhibition → 409 ARTIST_IN_USE`; `artwork create under artist, reorder, delete`.
- [ ] **Steps 2–4: fail, implement, pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(api): artists and artworks"`.

### Task 8: Fairs, news, locations modules

**Files:** controllers + services for the three modules; tests `fairs.e2e-spec.ts`, `news.e2e-spec.ts`, `locations.e2e-spec.ts`.

**Interfaces:** standard CRUD + `publish` for fairs and news; `PUT /fairs/order`, `PUT /locations/order`; news `list` sorted `publishedAt desc`, `exhibitionId` validated to exist; locations have no publish flag. Each write triggers `tagsFor(<entity>, slug)`.

- [ ] **Step 1: Write failing tests** — `fairs order persists`; `news with Tamil title round-trips unchanged`; `news exhibitionId must exist (400 fields.exhibitionId)`; `locations order persists`; `location tel must match ^\+\d{8,15}$`.
- [ ] **Steps 2–4.**  **Step 5: Commit** — `git commit -m "feat(api): fairs, news and locations"`.

### Task 9: Settings module

**Files:** `apps/api/src/settings/settings.controller.ts`, `settings.service.ts`; test `settings.e2e-spec.ts`.

**Interfaces:** `SettingsService.get<K extends SettingKey>(key: K): Promise<SettingValue<K>>` (falls back to `SETTING_DEFAULTS[key]`), `set(key, value)` validating with `settingSchemas[key]`, `getAll()`; routes `GET /settings`, `GET /settings/:key`, `PUT /settings/:key` (`@Roles('ADMIN')`); unknown key → 404; `EDITOR PUT → 403` is a test; write triggers `tagsFor('setting')`; `homeHeroExhibitionId` and `homeFocus.artistId` must reference existing rows.

- [ ] **Step 1: Write failing tests** — `PUT heroLayout SPLIT then GET returns SPLIT`; `PUT heroLayout BANANA → 400`; `GET unknown → 404`; `homeFocus.artistId must exist`.
- [ ] **Steps 2–4.**  **Step 5: Commit** — `git commit -m "feat(api): typed site settings"`.

### Task 10: Public read API and search

**Files:**
- Create: `apps/api/src/public/public.controller.ts`, `public.service.ts`, `home.service.ts`, `search.service.ts`, `public.mapper.ts`
- Create: migration `apps/api/prisma/migrations/<ts>_trgm/migration.sql` (`CREATE EXTENSION IF NOT EXISTS pg_trgm;` + GIN indexes on `Artist.name`, `Exhibition.title`, `News.title`)
- Modify: `apps/api/src/public/public.module.ts`
- Test: `apps/api/test/public.e2e-spec.ts`, `apps/api/src/public/home.service.spec.ts`

**Interfaces:**
- Consumes: `publicHomeSchema` etc. from shared (responses are validated with `schema.parse` in tests).
- Produces routes (all `@Public()`, `Cache-Control: public, max-age=0, s-maxage=60`): `GET /public/home`, `GET /public/exhibitions?status=&city=` (also returns `cities: string[]` distinct, ordered by first appearance like the prototype), `GET /public/exhibitions/:slug` (`{ exhibition, meta: [{k,v}×4], artists, works, press }`), `GET /public/artists?q=` (`{ featured, groups: [{ letter, items }], flat, layout }`), `GET /public/artists/:slug` (`{ artist, exhibitions, works }`), `GET /public/fairs`, `GET /public/news`, `GET /public/locations`, `GET /public/about`, `GET /public/settings` (footer + site + layouts), `GET /public/search?q=` (`{ groups: [{ label: 'Artists' | 'Exhibitions' | 'News', items: [{ label, href }] }] }`).
- `HomeService.build(today)` applies spec section 5 rules exactly: hero = override ?? most recent CURRENT by startDate ?? most recent by startDate; `upcoming` = soonest UPCOMING or `null`; `recent` = 3 PAST by endDate desc; `world` = country ≠ 'India' by startDate desc; `artistsLine` = first `homeArtistCount` by sortName; `news` = 3 latest by `publishedAt desc, createdAt desc`. `today` comes from `config/clock.ts`.
- Public mapper: exhibition `artistLine` joins names with `', '`; `datesLabel` = `datesLabel ?? formatDateRange(start, end)`; exhibition detail `meta` = Location `city, country`, Venue, Dates, Format (`Solo exhibition` / `Group exhibition`); works come from `ExhibitionWork` and carry `title, year, artist, medium, image`; artist detail works come from `Artwork` and carry `title, year, medium, size, image`; news carries `externalUrl: string | null`.

- [ ] **Step 1: Write failing tests** — unit `home.service`: `hero prefers override`, `hero falls back to most recent when nothing current`, `upcoming is null when none`, `recent has at most 3 past ordered by endDate desc`, `world excludes India`, `artistsLine respects homeArtistCount`. e2e: `unpublished exhibition absent from list, detail 404 and search`; `/public/exhibitions?status=past&city=Chennai filters`; `/public/artists groups K.M. Adimoolam under K`; `/public/search?q=நான் returns the Tamil news item under News`; `/public/search?q=Pichumani returns artist and 3 exhibitions`; every response parses with its shared schema.
- [ ] **Steps 2–4.**  **Step 5: Commit** — `git commit -m "feat(api): public read endpoints, home rules and trigram search"`.

---

## Phase B: Public website (`apps/web`)

### Task 11: Next.js scaffold, tokens, site shell, data client, visual harness

**Files:**
- Create: `apps/web/package.json`, `next.config.ts` (`images.remotePatterns` for `AWS_S3_PUBLIC_URL` host and `picsum.photos`), `tsconfig.json`, `postcss.config.mjs`, `.env.example`, `playwright.config.ts`, `vitest.config.ts`
- Create: `apps/web/styles/tokens.css` (Tailwind 4 `@theme` with the Global Constraints colours as `--color-paper` … `--color-imgph`, `--font-display`, `--font-ui`, `--font-tamil`, `--breakpoint-nav: 880px`), `apps/web/styles/globals.css` (prototype's base rules: body bg/colour, `a` colours, `::selection`, placeholder colour)
- Create: `apps/web/app/layout.tsx` (fonts via `next/font/google`: `EB_Garamond` 400/500 + italic 400, `Space_Grotesk` 400/500/600, `Noto_Serif_Tamil` 400/500; CSS variables), `apps/web/app/not-found.tsx`
- Create: `apps/web/components/site/Container.tsx`, `Header.tsx`, `HeaderNav.tsx`, `MobileMenu.tsx` (client, fixed overlay), `Footer.tsx`, `ImageSlot.tsx`, `Eyebrow.tsx`, `SectionRule.tsx`, `StatusBadge.tsx`, `PrimaryButton.tsx`, `TextLink.tsx`, `SearchButton.tsx`
- Create: `apps/web/lib/api.ts`, `apps/web/lib/tags.ts`, `apps/web/app/api/revalidate/route.ts`
- Create: `apps/web/reference/` (copy of `Art Houz Website.dc.html`, `support.js`, `image-slot.js`), `apps/web/reference/README.md`
- Create: `apps/web/tests/visual/harness.ts`, `apps/web/tests/visual/shell.spec.ts`
- Test: `apps/web/tests/unit/api.test.ts`

**Interfaces:**
- Produces: `apiGet<T>(path: string, schema: ZodType<T>, tags: string[]): Promise<T>` (`fetch(`${process.env.API_URL}${path}`, { next: { tags } })`, unwraps the envelope, `schema.parse(data)`; throws `ApiError`); `TAGS` constants mirroring `tagsFor` names; `POST /api/revalidate` verifies `x-revalidate-secret` and calls `revalidateTag` per tag, returns `{ ok: true, data: { revalidated: tags } }`.
- `ImageSlot({ image: PublicImage | null, ratio?: string, fill?: boolean, sizes: string, priority?: boolean, placeholder: string })` renders a `relative` box with `bg-imgph`, the prototype aspect ratio or absolute fill, and `next/image` `fill` + `object-cover` when `image` exists (alt from media); nothing else when null.
- `Header` is a server component that renders both the desktop nav and the mobile controls; visibility switches with the `nav:` breakpoint (`hidden nav:flex` / `flex nav:hidden`); active link colour rust with 1 px underline per prototype; `MobileMenu` and search overlay open via client state in `HeaderClient`.
- Visual harness: `normaliseReference(apiUrl): Promise<string>` (in `tests/visual/normalise.ts`) copies `reference/Art Houz Website.dc.html` to `test-results/reference.html` after four textual patches: rewrite the `AH_ARTISTS` array to the order returned by `GET /public/artists` (`flat`), rewrite the `AH_NEWS` array order to `GET /public/news`, replace `AH_NEWS.slice(1, 4)` with `AH_NEWS.slice(0, 3)`, and wrap the "Read article ↗" anchor in `<sc-if value="{{ n.hasUrl }}">` with `hasUrl: false` for every item (seed has no URLs); it throws if any patch target is not found. `renderPrototype(page, { route, width, props? })` opens the normalised file, seeds `localStorage['arthouz-route']` with `{ page, param }` before load (`page.addInitScript`), optionally rewrites the `data-props` defaults for `heroLayout`/`artistIndex`, waits for `document.fonts.ready` and network idle, scrolls to bottom and back to load lazy images, returns a full-page PNG; `renderPort(page, { path, width })` does the same against `http://localhost:3100`; `expectVisualMatch(a, b, { maxDiffRatio: 0.005, maxHeightDelta: 4 })` crops both to the smaller height and runs pixelmatch with `threshold: 0.1`, writing `diff.png` under `test-results/visual/<name>/` on failure.
- Playwright `webServer` starts api (`STORAGE_DRIVER=memory`, `TODAY_OVERRIDE=2026-10-30`, seeded test DB) and web (`NEXT_IMAGE_UNOPTIMIZED=1`, which sets `images.unoptimized` in `next.config.ts` outside production). `reference/README.md` lists the four patches and the frozen date.

- [ ] **Step 1: Write failing tests** — unit: `apiGet unwraps the envelope and parses with the schema`; `apiGet throws ApiError with code on ok:false`. Visual: `header and footer match the prototype at 375 and 1440` (clip to the header's 76 px and to the footer's bounding box on `/visit`, the shortest page).
- [ ] **Step 2: Run to verify they fail** — `pnpm --filter @arthouz/web test` and `pnpm --filter @arthouz/web test:visual -g shell`.
- [ ] **Step 3: Implement** — translate the prototype header/footer/menu markup one-to-one into Tailwind utilities; clamp values are copied verbatim as arbitrary values (`px-[clamp(20px,4vw,56px)]`); hex only through tokens; `backdrop-blur-[10px]`; footer nav labels and locations from `/public/locations` + `/public/settings`.
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(web): next scaffold, tokens, site shell and visual harness"`.

### Task 12: Home page

**Files:**
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/components/home/HeroFullBleed.tsx`, `HeroSplit.tsx`, `UpcomingBand.tsx`, `RecentExhibitions.tsx`, `ExhibitionCard.tsx`, `AcrossTheWorld.tsx`, `ArtistInFocus.tsx`, `ArtistsLine.tsx`, `Galleries.tsx`, `InThePress.tsx`, `NewsCard.tsx`
- Test: `apps/web/tests/visual/home.spec.ts`

**Interfaces:** Consumes `apiGet('/public/home', publicHomeSchema, [TAGS.home])`. `page.tsx` picks `HeroFullBleed` or `HeroSplit` from `heroLayout`; omits `UpcomingBand` when `upcoming` is null. `ArtistsLine` renders `name` links separated by `<span class="text-amber px-[0.32em]">·</span>` with no separator after the last.

- [ ] **Step 1: Write failing visual tests** — `home full-bleed matches at 375/768/1024/1440`; `home split matches at 1440 and 375` (prototype props rewritten to `Split`, API setting set to `SPLIT` via `PUT /settings/heroLayout` in `beforeAll`, reset after).
- [ ] **Step 2: Run to verify they fail.**  **Step 3: Implement section by section from the prototype's Home markup.**  **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(web): home page"`.

### Task 13: Exhibitions list and detail

**Files:**
- Create: `apps/web/app/exhibitions/page.tsx`, `apps/web/app/exhibitions/[slug]/page.tsx`, `apps/web/app/exhibitions/[slug]/not-found.tsx`
- Create: `apps/web/components/exhibitions/StatusChips.tsx` (client, writes `?status=`), `CityChips.tsx` (client, writes `?city=`), `ExhibitionRow.tsx`, `EmptyState.tsx`, `ExhibitionMeta.tsx`, `ArtistPills.tsx`, `WorksGrid.tsx`, `PressList.tsx`
- Test: `apps/web/tests/visual/exhibitions.spec.ts`, `apps/web/tests/unit/searchParams.test.ts`

**Interfaces:** `searchParams` → `status` (`current|upcoming|past`) and `city` passed to `/public/exhibitions`; chips use `useRouter().replace` with `scroll: false`; detail `generateMetadata` uses title + blurb + hero image; `generateStaticParams` omitted (dynamic with tags).

- [ ] **Step 1: Write failing tests** — visual `exhibitions list matches at 4 widths`; `exhibitions filtered status=past&city=Chennai matches` (prototype state seeded with `{ page: 'exhibitions', city: 'Chennai', status: 'past' }`); `exhibition detail tidewater matches at 4 widths`; `detail without press hides the Press block` (prototype `quiet-matter`); unit: `parses invalid status to undefined`.
- [ ] **Steps 2–4.**  **Step 5: Commit** — `git commit -m "feat(web): exhibitions list and detail"`.

### Task 14: Artists list and detail

**Files:**
- Create: `apps/web/app/artists/page.tsx`, `apps/web/app/artists/[slug]/page.tsx`
- Create: `apps/web/components/artists/FeaturedGrid.tsx`, `ArtistSearch.tsx` (client, `?q=` debounced 150 ms), `LetterStrip.tsx` (client, smooth scroll with 96 px offset), `GroupedIndex.tsx` (`columns:3 220px`), `FlowingIndex.tsx`, `ArtistExhibitions.tsx`, `SelectedWorks.tsx`
- Test: `apps/web/tests/visual/artists.spec.ts`

- [ ] **Step 1: Write failing tests** — `artists grouped matches at 4 widths`; `artists flowing matches at 1440` (setting `artistIndexLayout=FLOWING` + prototype props); `artists?q=pich shows only matches`; `artists?q=zzz shows "No artists match “zzz”."`; `artist detail vijay-pichumani matches at 4 widths`; `artist without exhibitions hides the block`.
- [ ] **Steps 2–4.**  **Step 5: Commit** — `git commit -m "feat(web): artists index and detail"`.

### Task 15: Fairs, news, about, visit

**Files:**
- Create: `apps/web/app/fairs/page.tsx`, `apps/web/app/news/page.tsx`, `apps/web/app/about/page.tsx`, `apps/web/app/visit/page.tsx`
- Create: `apps/web/components/fairs/FairRow.tsx`; `components/news/NewsArticle.tsx`; `components/about/AboutTabs.tsx` (client, `?tab=`), `GalleryTab.tsx`, `ProprietorTab.tsx`, `ServicesTab.tsx`, `PublicationsTab.tsx`; `components/visit/LocationCard.tsx`
- Test: `apps/web/tests/visual/pages.spec.ts`, `apps/web/tests/unit/fonts.test.tsx`

- [ ] **Step 1: Write failing tests** — visual for each page at 4 widths, about for each of the 4 tabs at 1440 and 375; unit `NewsArticle title uses the display font stack ending in Noto Serif Tamil` (render and assert the computed `font-family` class contains `font-display-tamil`, defined in tokens as `'EB Garamond','Noto Serif Tamil',serif`).
- [ ] **Steps 2–4.** News "Read article ↗" is an `<a href={externalUrl} target="_blank" rel="noopener">` rendered only when `externalUrl` is set (the harness patches the prototype the same way).
- [ ] **Step 5: Commit** — `git commit -m "feat(web): fairs, news, about and visit pages"`.

### Task 16: Search overlay, mobile menu, metadata, accessibility pass

**Files:**
- Create: `apps/web/components/site/SearchOverlay.tsx` (client; fetches `/public/search?q=` via a route handler `apps/web/app/api/search/route.ts` that proxies to the API, debounced 200 ms), `apps/web/components/site/HeaderClient.tsx`
- Modify: `apps/web/components/site/Header.tsx`, `MobileMenu.tsx`, `apps/web/app/layout.tsx` (site metadata from `/public/settings`, `metadataBase`)
- Create: `apps/web/app/sitemap.ts`, `apps/web/app/robots.ts`
- Modify: `apps/web/next.config.ts` — `redirects()` with permanent section-level redirects from the old site: `/exhibition/:path*` → `/exhibitions`, `/artist/:path*` → `/artists`, `/fair/:path*` → `/fairs`, `/news/:path+` → `/news`, `/contact` → `/visit`
- Test: `apps/web/tests/visual/overlays.spec.ts`, `apps/web/tests/a11y/pages.spec.ts` (axe on every route at 375 and 1440)

- [ ] **Step 1: Write failing tests** — `search overlay with q=pich matches prototype at 1440 and 375`; `empty search shows "Nothing found for “zzz”."`; `mobile menu matches at 375`; `Escape closes overlays and returns focus to the trigger`; a11y: `no serious or critical axe violations on any route`; `every control has a 44 px hit area` (query interactive elements, assert `getBoundingClientRect` or padding-extended pseudo area ≥ 44 — implement via `before:` pseudo-element on small controls).
- [ ] **Steps 2–4.**  **Step 5: Commit** — `git commit -m "feat(web): search, mobile menu, metadata and accessibility"`.

---

## Phase C: Admin (`apps/admin`)

### Task 17: Vite scaffold, tokens, UI primitives, auth, shell, routes

**Files:**
- Create: `apps/admin/package.json`, `vite.config.ts` (port 5180, `server.proxy` not used; API via `VITE_API_URL`), `tsconfig.json`, `index.html`, `.env.example`, `vitest.config.ts`, `playwright.config.ts`
- Create: `apps/admin/src/styles/tokens.css` (port of `mockups/admin/mock.css` `:root` into Tailwind 4 `@theme`), `apps/admin/src/styles/app.css`
- Create: `apps/admin/src/main.tsx`, `apps/admin/src/app/router.tsx` (lazy routes for every page in spec section 8; placeholder pages created here and replaced by later tasks), `apps/admin/src/app/AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `RequireAuth.tsx`, `RequireRole.tsx`
- Create: `apps/admin/src/lib/api.ts`, `queryClient.ts`, `toast.tsx`, `useZodForm.ts`, `format.ts`
- Create: `apps/admin/src/components/ui/Button.tsx`, `Field.tsx`, `Input.tsx`, `Textarea.tsx`, `Select.tsx`, `Switch.tsx`, `Chip.tsx`, `StatusChip.tsx`, `DataTable.tsx`, `Pager.tsx`, `ConfirmModal.tsx`, `ErrorSummary.tsx`, `Tabs.tsx`, `RadioCards.tsx`, `ImageSlot.tsx`, `OrderedList.tsx`, `Dropzone.tsx`, `Icon.tsx`
- Create: `apps/admin/src/features/auth/LoginPage.tsx`, `useSession.ts`
- Test: `apps/admin/src/lib/api.test.ts`, `apps/admin/src/components/ui/ErrorSummary.test.tsx`, `OrderedList.test.tsx`, `apps/admin/src/features/auth/LoginPage.test.tsx`, `apps/admin/src/test/msw.ts`

**Interfaces:**
- Produces: `api.get<T>(path)`, `api.post<T>(path, body)`, `api.put`, `api.patch`, `api.delete`, `api.upload<T>(path, formData, onProgress)` — all `credentials: 'include'`, unwrap the envelope, throw `ApiError { status, code, message, fields }`; `useZodForm(schema, defaults)` = RHF + zodResolver + `applyServerErrors(err: ApiError)`; `<ErrorSummary errors>` renders the "There is a problem" box, focuses itself on mount, links to `#field-<name>`; `<Field name label help required>` wires `aria-describedby` and shows the inline error; `<OrderedList items onMove(id, dir) onRemove renderItem>` with move up/down buttons (keyboard alternative) and optional drag; `<ConfirmModal open title body confirmLabel danger onConfirm onCancel>` (never `window.confirm`); `<StatusChip status>` maps to the four chip styles; `useSession()` returns `{ user, isLoading, logout }` from `GET /auth/me`; `RequireAuth` redirects to `/login` with `?next=`.
- Routes: `/login`, `/`, `/exhibitions`, `/exhibitions/new`, `/exhibitions/:id`, `/artists`, `/artists/new`, `/artists/:id`, `/fairs`, `/fairs/:id`, `/news`, `/news/:id`, `/locations`, `/about`, `/settings`, `/media`, `/users`.

- [ ] **Step 1: Write failing tests** — `api throws ApiError with fields on 400`; `ErrorSummary focuses on mount and links fields`; `OrderedList move down swaps order and announces via aria-live`; `LoginPage shows error summary on invalid email and server 401 message`; `LoginPage shows "Too many attempts" on 429`.
- [ ] **Steps 2–4.**  **Step 5: Commit** — `git commit -m "feat(admin): scaffold, design tokens, ui kit, auth and shell"`.

### Task 18: Media library and picker

**Files:**
- Create: `apps/admin/src/features/media/MediaPage.tsx`, `MediaGrid.tsx`, `MediaDetailPanel.tsx`, `UploadQueue.tsx`, `useMedia.ts`, `MediaPicker.tsx` (modal used by every editor), `ImageField.tsx` (slot + Replace/Remove + opens picker)
- Test: `UploadQueue.test.tsx`, `MediaPicker.test.tsx`, `MediaDetailPanel.test.tsx`

**Interfaces:** `ImageField({ value: MediaRef | null, onChange, ratio, label })` where `MediaRef = { id, url, thumbUrl, width, height, alt }`; `UploadQueue` requires alt text per file before `POST /media`, shows progress from `api.upload`; delete shows `ConfirmModal`; a 409 `MEDIA_IN_USE` opens an info modal listing `usedBy`.

- [ ] **Step 1: Write failing tests** — `upload button disabled until alt text entered`; `progress updates from onProgress`; `picker returns the selected MediaRef`; `delete in-use media shows usage list, not an error toast`.
- [ ] **Steps 2–4.**  **Step 5: Commit** — `git commit -m "feat(admin): media library, upload queue and picker"`.

### Task 19: Exhibitions list and editor

**Files:**
- Create: `apps/admin/src/features/exhibitions/ExhibitionsListPage.tsx`, `ExhibitionFilters.tsx`, `BulkBar.tsx`, `ExhibitionEditorPage.tsx`, `DetailsCard.tsx`, `DatesCard.tsx`, `TextCard.tsx`, `ArtistsPicker.tsx`, `WorksCard.tsx`, `WorkDialog.tsx`, `ImportWorkDialog.tsx`, `PressCard.tsx`, `PublishCard.tsx`, `useExhibitions.ts`, `useExhibitionWorks.ts`
- Test: `DatesCard.test.tsx`, `ArtistsPicker.test.tsx`, `WorksCard.test.tsx`, `ExhibitionEditorPage.test.tsx`, `ExhibitionsListPage.test.tsx`

**Interfaces:** Consumes `exhibitionInputSchema`, `exhibitionWorkInputSchema`, `formatDateRange`, `resolveExhibitionStatus`. `DatesCard` shows the computed label and status chip live from the form values; `WorksCard` lists `ExhibitionWork` rows as an `OrderedList` (36 px thumb, title, year, artist, medium) with "Add work" (`WorkDialog`: `ImageField` + fields, artist select limited to the exhibition's artists) and "Import from artist's works" (`ImportWorkDialog` lists artworks of the exhibition's artists and posts `/works/import`); list page URL state `?status=&city=&published=&q=&page=`; bulk bar calls `PATCH /exhibitions/publish`.

- [ ] **Step 1: Write failing tests** — `DatesCard previews "October 3 – November 22, 2026" and CURRENT chip`; `end before start shows inline error under End date and the summary`; `ArtistsPicker move up reorders and PUTs ids in order on save`; `WorkDialog artist select offers only the exhibition's artists`; `ImportWorkDialog posts the artwork id and the new work appears in the list`; `server 400 fields map onto the form`; `bulk publish sends selected ids`.
- [ ] **Steps 2–4.**  **Step 5: Commit** — `git commit -m "feat(admin): exhibitions list and editor"`.

### Task 20: Artists list and editor

**Files:** `apps/admin/src/features/artists/ArtistsListPage.tsx`, `LetterStrip.tsx`, `FeaturedOrderCard.tsx`, `ArtistEditorPage.tsx`, `ProfileCard.tsx`, `WorksGrid.tsx`, `WorkDialog.tsx`, `VisibilityCard.tsx`, `useArtists.ts`; tests `ArtistsListPage.test.tsx`, `WorksGrid.test.tsx`, `ArtistEditorPage.test.tsx`.

**Interfaces:** `WorksGrid` CRUDs `/artists/:id/artworks` and reorders with move buttons; `FeaturedOrderCard` PUTs `/artists/featured-order`; sort name defaults shown as placeholder from the name.

- [ ] **Step 1: Write failing tests** — `letter strip sets ?letter=`; `featured order move persists`; `work dialog validates year as 4 digits`; `delete artist 409 shows the exhibitions that block it`.
- [ ] **Steps 2–4.**  **Step 5: Commit** — `git commit -m "feat(admin): artists list and editor with works"`.

### Task 21: Fairs, news, locations

**Files:** `features/fairs/FairsPage.tsx`, `FairEditor.tsx`; `features/news/NewsListPage.tsx`, `NewsEditorPage.tsx`, `ExhibitionSelect.tsx`; `features/locations/LocationsPage.tsx`, `LocationCard.tsx`; tests per page.

- [ ] **Step 1: Write failing tests** — `fairs move up PUTs order`; `news editor shows the exhibition help copy only when linked`; `news Tamil title renders in display font`; `location tel field rejects non E.164 inline`; `locations save per card`.
- [ ] **Steps 2–4.**  **Step 5: Commit** — `git commit -m "feat(admin): fairs, news and locations"`.

### Task 22: About, home & settings, dashboard, users

**Files:** `features/about/AboutPage.tsx` + four tab components; `features/settings/SettingsPage.tsx`, `HeroLayoutCards.tsx`, `ArtistIndexCards.tsx`, `FocusArtistCard.tsx`, `FooterCard.tsx`, `SiteCard.tsx`; `features/dashboard/DashboardPage.tsx`, `useDashboard.ts` (composes `/exhibitions?status=current`, `?status=upcoming`, `?published=false`, `/media?missingAlt=true` — add that filter to Task 5's `list` if absent, and `/public/home` for "on the home page now"); `features/users/UsersPage.tsx`, `UserDialog.tsx`; tests per page.

- [ ] **Step 1: Write failing tests** — `about tab switch keeps unsaved changes per tab`; `settings hero radio PUTs heroLayout`; `homeArtistCount rejects 0`; `dashboard shows drafts count`; `users page and settings save hidden for EDITOR (read-only view with a note)`.
- [ ] **Steps 2–4.**  **Step 5: Commit** — `git commit -m "feat(admin): about, settings, dashboard and users"`.

---

## Phase D: End-to-end and finish

### Task 23: Cross-app E2E and coverage gates

**Files:**
- Create: `apps/admin/e2e/publish-flow.spec.ts`, `apps/admin/e2e/fixtures.ts`
- Modify: coverage thresholds in `packages/shared/vitest.config.ts`, `apps/api/jest.config.ts`, `apps/web/vitest.config.ts`, `apps/admin/vitest.config.ts` (80 % lines/branches/functions)
- Modify: root `package.json` script `verify` = typecheck + lint + unit + api e2e + web visual + admin e2e

- [ ] **Step 1: Write the failing E2E** — `editor logs in, creates exhibition "Salt Line" with hero image upload, adds artist Parvathi Nayar, publishes, and the public /exhibitions page lists "Salt Line" with the uploaded image within 5 s` (web served with `API_URL` pointing at the same test api; revalidation secret shared).
- [ ] **Step 2: Run to verify it fails for the right reason**, then fix any gap it exposes, **Step 3: Run `pnpm verify`** — Expected: all green, each coverage report ≥ 80 %.
- [ ] **Step 4: Commit** — `git commit -m "test: end-to-end publish flow and coverage gates"`.

### Task 24: Docs, env audit, review

**Files:**
- Create: `README.md` (run locally: Postgres, `.env` per app, `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev`; ports; how to run visual tests), `docs/deploy.md` (short: build outputs, required env, R2 CORS note, reverse-proxy cookie/CORS requirements, revalidate secret), `docs/superpowers/specs/…` updated with any deviation recorded in `apps/web/reference/README.md`
- Modify: the three `.env.example` files (every key from `config/env.ts`, `next.config.ts` and `vite.config.ts`, no values)

- [ ] **Step 1: Audit** — `grep -rhoE "process\.env\.[A-Z0-9_]+|import\.meta\.env\.[A-Z0-9_]+" apps | sort -u` and confirm each appears in the matching `.env.example`.
- [ ] **Step 2: Run the security checklist** from `~/.claude/rules/security.md` (no secrets, input validated, rate limit on login, error messages do not leak) and dispatch the `security-reviewer` and `code-reviewer` agents on the whole branch; fix CRITICAL/HIGH.
- [ ] **Step 3: Commit** — `git commit -m "docs: local setup, deploy note and env examples"`.

---

## Self-review notes

- Spec coverage: section 5 routes → Tasks 11–16; section 6 model → Task 2; section 7 API → Tasks 4–10; section 8 admin → Tasks 17–22; R2/env → Task 5; revalidation → Task 6 + Task 11; visual acceptance → Task 11 harness + per-page specs; seed → Task 3; coverage → Task 23; deploy note → Task 24.
- Builder-check resolutions folded in: `ExhibitionWork` model (Tasks 2, 3, 6, 10, 19), reference normalisation + frozen clock + unoptimised images (Tasks 2, 11), roles matrix (Tasks 4, 9, 22), section-level legacy redirects (Task 16). Open for the user: Next.js vs SPA, hosting same-site, R2 bucket, per-record legacy URLs.
- Names used across tasks: `apiGet`, `ImageSlot`, `PublicImage`, `tagsFor`/`TAGS`, `ApiError`, `OrderedList`, `ImageField`, `MediaRef`, `StatusChip`, `resolveExhibitionStatus`, `formatDateRange`, `uniqueSlug`, `RevalidateService.trigger`, `STORAGE`/`Storage`, `today()`, `normaliseReference` — defined once in the task that produces them and reused verbatim.
