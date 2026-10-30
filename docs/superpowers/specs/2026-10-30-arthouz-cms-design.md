# Art Houz website + CMS: design

Date: 2026-10-30
Status: draft for approval
Source prototype: `Art Houz responsive website.zip` (Design Canvas `.dc.html`, 9 screens, inline mock data)

## 1. Intent

Art Houz is a contemporary art gallery (Chennai and Bengaluru, founded 2012). A new public website has been designed as a single Design Canvas prototype. Today the prototype's content is hard-coded JavaScript (exhibitions, artists, fairs, news, locations, about copy) and images are picsum placeholders.

Build two things:

1. **Public website** that reproduces the prototype's UI exactly (layout, type, colour, spacing, hover states, responsive behaviour) but renders real content from a database.
2. **CMS** where gallery staff manage that content (text, images, ordering, publish state, and the two layout switches the prototype exposes) without touching code.

Success: a staff member can add a new exhibition with images and artists in the CMS, publish it, and it appears on the public site in the prototype's design within seconds. A pixel comparison of each public screen against the prototype at 375, 768, 1024 and 1440 px shows no layout difference.

## 2. Goals, non-goals, anti-goals

Goals
- Pixel-faithful port of all 9 prototype screens plus the mobile menu and search overlays.
- Every piece of content visible on the public site is editable in the CMS. No hard-coded copy except fixed UI chrome (nav labels, section headings like "Recent exhibitions", button labels).
- Real URLs for every screen (prototype uses in-memory state and localStorage). Shareable, indexable, back button works.
- Images stored in Cloudflare R2, same env conventions as the existing `api` service.
- Publish state per record so staff can draft before going live.
- The admin UI is designed, not templated: Art Houz palette and typography, Swiss/minimal structure, dense enough for editing work.

Non-goals (explicitly out of scope for this build)
- Artwork sales, pricing, cart, enquiry forms. The prototype's "Enquire" buttons link to the Visit page; keep that behaviour.
- Content versioning, scheduling, approval workflow. A boolean publish flag is enough.
- Multi-language UI. Tamil appears only inside content (news titles) and must render with the Tamil fallback fonts as in the prototype.
- Newsletter, analytics dashboards, comments.
- Production deployment pipeline. Deliver `.env.example`, build scripts and a short deploy note; the hosting target is decided later.
- Redesigning the public site. The prototype is the design.

Anti-goals (would make this a failure even if it works)
- A public site that "looks close" but drifts: different clamp() values, different font weights, rounded corners, different hover colours.
- A generic admin template (sidebar + cards + charts) that does not feel like Art Houz.
- Hard-coded content left in React components.
- Content that disappears when an image fails to load (every image slot keeps its `#D8D3CA` placeholder block at the correct aspect ratio).

## 3. What exists today (prototype inventory)

Screens (all inside one `.dc.html`): Home, Exhibitions, Exhibition detail, Artists, Artist detail, Fairs, News, About (4 tabs: Gallery, Proprietor, Services, Publications), Visit. Plus fixed overlays: mobile Menu (below 880 px) and Search.

Design tokens used by the prototype (must be reproduced verbatim)
- Colours: paper `#EDEAE4`, ink `#161513`, amber `#D98A2B`, rust `#B4651A`, body `#3B3833`, muted `#5E5A54`, placeholder text `#8A857D`, dark-on-dark text `#C9C4BB`, footer meta `#A8A39A`, image placeholder `#D8D3CA`. Hairlines `rgba(22,21,19,0.12 / 0.14 / 0.16 / 0.18 / 0.3)` and `rgba(237,234,228,0.16 / 0.18 / 0.2)` on dark.
- Type: EB Garamond 400/500 + italic (display, titles, quotes), Space Grotesk 400/500/600 (UI, body, labels), Noto Serif Tamil 400/500 (fallback for Tamil titles). Loaded from Google Fonts in the prototype.
- Container: `max-width:1440px`, side padding `clamp(20px,4vw,56px)`. Section bottom padding `clamp(72px,9vw,140px)`. Header height 76 px, sticky, `rgba(237,234,228,0.94)` with 10 px blur.
- Breakpoint: header switches to mobile (search icon + MENU button) below 880 px. Everything else is fluid via flex-wrap, `auto-fit/auto-fill` grids and clamp().
- Hover: links turn rust; primary buttons invert to amber background with ink text; outline chips invert to ink.
- Two layout switches exposed as prototype props: `heroLayout` (Full-bleed | Split) and `artistIndex` (Grouped A–Z | Flowing).

Content model implied by the bindings (see section 6 for the schema): exhibitions (with artists, works, press), artists (with works), fairs, news, locations, about page sections, home curation (hero, upcoming, artist in focus), footer tagline and social links.

Placeholder content in the prototype: artist medium, base city, birth year, lede and bio are generated from a hash of the name. Images are picsum seeds. The seed data in this build keeps that text so the pixel comparison is apples to apples, and it is clearly marked for replacement in the CMS.

## 4. Decisions made (as decided)

Decided by the user
- Stack: React, NestJS, PostgreSQL, Tailwind CSS.
- Images in Cloudflare R2, reusing the conventions already used by `node-cms-api` and `api` in FindMyPlots.
- Design guidance for the CMS from the ui-ux-pro-max skill; the public UI follows the prototype exactly.
- Mockups delivered as local HTML files opened in the browser.

Decided by me (builder may not change without a reason recorded in the plan)
- **Monorepo** `~/Documents/arthouz` with pnpm workspaces: `apps/web`, `apps/admin`, `apps/api`, `packages/shared`.
- **Public site = Next.js 16 (App Router, React 19)**, not a Vite SPA. Reason: a gallery site lives on search and shared links; exhibitions and artists must be server-rendered with real URLs and metadata. Next.js is React, so it satisfies the stated stack. Flagged as the one decision the user may want to override; a Vite SPA port is the same components behind a client router and loses SEO.
- **Admin = Vite + React 19 + Tailwind v4**, TanStack Query, React Hook Form + Zod, TanStack Table. Separate app and origin from the public site.
- **API = NestJS 11 + Prisma 7 + PostgreSQL 16.** Zod schemas in `packages/shared` are the single source of DTO validation, reused by admin forms.
- **Auth:** email + password (argon2id), JWT in an httpOnly `SameSite=Lax` cookie, 7-day expiry, roles `ADMIN` and `EDITOR`. Login rate-limited (5 per minute per IP). Mutating routes check `Origin` against the admin origin. No self-signup; the first admin is seeded from env.
- **Publish flag** (`isPublished`) on exhibitions, artists, artworks, fairs, news. Public endpoints only return published rows. Locations, about sections and settings are always live.
- **Exhibition status is derived** from `startDate`/`endDate` in Asia/Kolkata (`CURRENT`, `UPCOMING`, `PAST`) with an optional `statusOverride`. Dates render in the prototype's format; an optional `datesLabel` prints verbatim when staff need exact copy.
- **Media pipeline:** upload through the API (multipart, max 25 MB, jpeg/png/webp/avif). `sharp` auto-orients, reads dimensions, writes a 480 px WebP thumbnail. Original and thumbnail go to R2 under `arthouz/YYYY/MM/<uuid>.<ext>`. The public site uses Next `<Image>` with the R2 public host in `remotePatterns`, so responsive WebP/AVIF is handled at the edge of the web app; no further variants are stored. Alt text is a required field.
- **Env names** (match `api/src/common/lib/s3.service.ts`): `S3_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_S3_PUBLIC_URL`; region `auto`; `@aws-sdk/client-s3`.
- **Cache invalidation:** the web app fetches public endpoints with Next cache tags; every API write posts `{ tags }` to `POST {WEB_URL}/api/revalidate` with a shared secret header. Same pattern the user already runs for FindMyPlots PDP pages.
- **Search** is server-side: `GET /public/search?q=` over artists (name), exhibitions (title, subtitle, city, country, artist names) and news (title, excerpt), ILIKE with `pg_trgm` indexes, grouped as the prototype groups them (Artists ≤ 8, Exhibitions all, News ≤ 6).
- **URL state** on the public site: exhibitions filters as `?status=&city=`, artists search as `?q=`, about tab as `?tab=`.
- **Ports (dev):** web 3100, admin 5180, api 4100. Chosen to avoid the user's running FindMyPlots services (3000, 3001, 4000, 5000, 5173, 5174).
- **Seed:** the prototype's data converted verbatim (9 exhibitions, 10 news items, 55 artists, 4 fairs, 2 locations, about copy, settings) with picsum image URLs recorded as Media rows. This is what the pixel comparison runs against.
- **Visual regression harness:** Playwright renders the original `.dc.html` (copied into `apps/web/reference/`) and the port side by side at 375/768/1024/1440 and diffs them with pixelmatch; threshold 0.5 % of pixels per screen. This is the acceptance test for "exact UI".
- **Exhibition works are their own rows.** In the prototype, "Works in the exhibition" are installation views and works in the show with their own caption (title, year, artist, medium); they are not the artist's "Selected works". So `ExhibitionWork` has its own image and caption fields, an optional `artworkId` pointing at the artist artwork it was imported from, and appears only on that exhibition. Artist pages show `Artwork` rows only.
- **Prototype quirks are normalised in the reference, not copied into the rules.** The prototype's artist index and news list follow a hand-made array order, its home press block is `AH_NEWS.slice(1, 4)`, and it shows "Read article ↗" even when there is no URL. The CMS rules are: artists alphabetical by `sortName` (PostgreSQL `en-x-icu` collation), news by `publishedAt` desc then `createdAt`, home press = 3 latest, "Read article" only when `externalUrl` is set. The visual harness rewrites the reference copy to those rules before diffing (reorders `AH_ARTISTS` and `AH_NEWS` from the API, patches `slice(1, 4)` to `slice(0, 3)`, hides the link when `externalUrl` is absent). Each patch is listed in `apps/web/reference/README.md`.
- **The visual baseline is frozen.** Status is date-derived, so the API honours `TODAY_OVERRIDE=2026-10-30` (ignored in production) and the visual run sets it; the prototype's hard-coded statuses were authored for that date. The visual run also sets `NEXT_IMAGE_UNOPTIMIZED=1` so both sides load identical picsum bytes; production keeps Next image optimisation on.
- **Roles.** `EDITOR`: all content, media, ordering, publish/unpublish and delete. `ADMIN`: everything an editor can do plus Users and Home & settings writes. Guards on the API, controls hidden in the admin.
- **Cookie auth requires the admin and API to be same-site in production** (e.g. `cms.arthouz.com` + `api.arthouz.com`, or one host with `/api` proxied). The admin reads the API base from `VITE_API_URL`, so a same-origin `/api` path works without code changes. `SameSite=None` plus CSRF tokens is not planned.
- **Separate R2 bucket** for Art Houz (own bucket, own API token, own public host). Only the env variable names are shared with FindMyPlots.
- **Legacy URLs.** Section-level 301s from the old site (`/exhibition/:x` → `/exhibitions`, `/artist/:x` → `/artists`, `/fair/:x` → `/fairs`, `/news/:x` → `/news`) live in `next.config.ts`. Per-record redirects need the old URL inventory and are an open decision.
- **Admin visual direction:** "gallery ledger". Paper-light background `#F4F2EE`, white surfaces, ink text, hairline rules, amber for focus/active/primary-hover, rust for links. Space Grotesk 13 to 14 px for UI, EB Garamond for page and record titles. Square corners (2 px max). Row height 48 px, 8 px spacing grid. Motion 150 to 200 ms, reduced-motion respected. Status chips mirror the public site's three badge styles plus a dashed "Draft".

## 5. Public site: routes and behaviour

| Route | Prototype screen | Data |
|---|---|---|
| `/` | Home | hero exhibition, upcoming band, 3 recent past, "across the world" (country ≠ India), artist in focus, artists line, locations, 3 latest news |
| `/exhibitions?status=&city=` | Exhibitions | all published exhibitions; chips for status and distinct cities |
| `/exhibitions/[slug]` | Exhibition detail | exhibition, meta list, artists, works, press |
| `/artists?q=` | Artists | featured grid (isFeatured, ordered), A–Z index grouped by sortName initial, or flowing per setting |
| `/artists/[slug]` | Artist detail | artist, exhibitions with Art Houz, selected works |
| `/fairs` | Fairs | fairs ordered by sortOrder |
| `/news` | News | news by publishedAt desc; "Read article ↗" opens externalUrl; "View exhibition →" when linked |
| `/about?tab=gallery\|proprietor\|services\|publications` | About | four sections from settings |
| `/visit` | Visit | locations |
| overlays | Menu, Search | search calls `/public/search` |

Rules that reproduce prototype behaviour
- Hero picks `settings.homeHeroExhibitionId` if set, else the most recent `CURRENT`, else the most recent exhibition. Hero layout from `settings.heroLayout`.
- Upcoming band shows the soonest `UPCOMING`; the band is omitted if none.
- "Recent exhibitions" = 3 most recent `PAST` by endDate.
- Artists line on home = first `settings.homeArtistCount` (default 22) published artists by sortName, separated by amber middle dots, none after the last.
- Artist in focus = `settings.homeFocus { artistId, text, imageId, mediumLabel, baseLabel }`.
- Artist index letter = first character of `sortName` (defaults to name), uppercased. Letter buttons scroll to the group with a 96 px offset.
- Status badge styles: Now on view (amber fill, ink text), Upcoming (ink fill, paper text), Past (transparent, muted text, 30 % hairline).
- Empty states keep the prototype copy: "No exhibitions match this filter.", "No artists match “…”.", "Nothing found for “…”."
- Every image slot is a positioned box with the prototype's aspect ratio and `#D8D3CA` background; the image covers it. Missing image = the bare block.
- Fonts via `next/font/google` with the exact weights the prototype loads. `font-display: swap`.
- Touch targets under 44 px in the prototype (letter buttons are 36 px, 12.5 px nav links) keep their visual size and get an invisible hit area via padding or pseudo-element. Visible design does not change.

## 6. Data model

All tables have `id` (uuid), `createdAt`, `updatedAt`. Slugs are unique, generated from the title or name, editable.

- **User**: email (unique), passwordHash, name, role (`ADMIN` | `EDITOR`), lastLoginAt.
- **Media**: key, url, thumbUrl, width, height, mime, bytes, alt (required), caption?, uploadedById.
- **Exhibition**: slug, title, subtitle, city, country, type (`SOLO` | `GROUP`), startDate, endDate, datesLabel?, statusOverride?, venue, blurb, body, heroImageId, isPublished, sortOrder.
- **ExhibitionArtist**: exhibitionId, artistId, sortOrder (composite PK). Artist line = names joined with ", " in this order.
- **ExhibitionWork**: exhibitionId, imageId, title, year, artistId, medium, sortOrder, artworkId? (source artwork when imported). Shown only on the exhibition page.
- **Artist**: slug, name, sortName, medium (free text, e.g. "Painting & wood carving"), base (city), born?, lede, bio, portraitImageId, isFeatured, featuredOrder, isPublished.
- **Artwork**: artistId, title, year, medium, size, imageId, sortOrder, isPublished.
- **Fair**: slug, title, venue, city, dateLabel ("March 2026"), booth, text, imageId, sortOrder, isPublished. Rendered "where" = `venue, city · dateLabel`.
- **News**: slug, title, excerpt, publishedAt (date; rendered "February 2024"), imageId, externalUrl?, exhibitionId?, isPublished.
- **Location**: slug, city, address, phone (display), tel (E.164 href), days, hours, mapUrl, imageId, sortOrder.
- **Setting**: key (PK), value (JSONB), validated per key by a Zod schema in `packages/shared`. Keys: `heroLayout`, `artistIndexLayout`, `homeHeroExhibitionId`, `homeArtistCount`, `homeFocus`, `about.gallery`, `about.proprietor`, `about.services`, `about.publications`, `footer` (tagline, instagramUrl, facebookUrl, copyrightFrom), `site` (title, description, ogImageId).

Indexes: slugs unique; `pg_trgm` GIN on artist.name, exhibition.title, news.title; btree on exhibition(startDate, endDate), news(publishedAt). Deleting a Media row that is referenced is refused with a message listing where it is used.

## 7. API surface (NestJS)

Public (no auth, cache headers, published only)
- `GET /public/home`
- `GET /public/exhibitions?status=&city=` and `GET /public/exhibitions/:slug`
- `GET /public/artists?q=` and `GET /public/artists/:slug`
- `GET /public/fairs`, `GET /public/news`, `GET /public/locations`, `GET /public/about`, `GET /public/settings`
- `GET /public/search?q=`

Admin (cookie auth)
- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- CRUD + reorder for exhibitions, artists, artworks, fairs, news, locations; `PATCH …/:id/publish`
- Exhibition works: `GET/POST /exhibitions/:id/works`, `POST /exhibitions/:id/works/import` (from an artwork), `PATCH/DELETE /works/:id`, `PUT /exhibitions/:id/works/order`
- `GET/PUT /settings/:key` (PUT is ADMIN only)
- `POST /media` (multipart), `GET /media?q=&page=`, `PATCH /media/:id` (alt, caption), `DELETE /media/:id`
- `GET/POST/PATCH/DELETE /users` (ADMIN only)

Every response uses one envelope: `{ ok, data, error, meta }`. Every write triggers revalidation tags for the affected pages. Validation errors return field-level messages the admin shows inline plus a focusable error summary.

## 8. Admin (CMS) screens

Shell: left sidebar (brand mark, Dashboard, Exhibitions, Artists, Fairs, News, Locations, About page, Home & settings, Media, Users), top bar with breadcrumb and page actions (Save, Publish toggle), ⌘K search over all records.

- **Login**: single card, email, password, error summary, rate-limit message.
- **Dashboard**: now on view, upcoming, drafts awaiting publish, recently edited, quick links. No charts.
- **Exhibitions**: table (thumbnail, title, city, dates, status chip, published, updated). Filters: status, city, published. Bulk publish/unpublish. Row click opens editor.
- **Exhibition editor**: two-column. Left: title, subtitle, type, city, country, venue, dates (with datesLabel override), blurb, body, artists (ordered picker with move up/down), works (ordered list of exhibition works, each with image, title, year, artist, medium; "Add work" opens a dialog, "Import from artist's works" copies an artwork's fields), press (news linked to this exhibition, read-only list with "add news"). Right: hero image slot, publish state, slug, "View on site" link, status preview chip.
- **Artists**: table with search, featured toggle, published. Featured order editable via move up/down.
- **Artist editor**: name, sortName, medium, base, born, lede, bio, portrait, featured, published; Works section with inline grid (add/edit/reorder artworks, each with image, title, year, medium, size).
- **Fairs**, **News**, **Locations**: list + editor in the same pattern. News editor has externalUrl and an exhibition link picker.
- **About page**: four tabs matching the public tabs; each has its image slot and copy fields.
- **Home & settings**: hero layout radio (Full-bleed / Split) with tiny preview, artist index radio (Grouped / Flowing), hero override picker, artist-in-focus block, home artist count, footer tagline, social URLs, copyright start year, site title/description/OG image.
- **Media**: grid with upload drop zone (and a file button), progress per file, alt text required before use, usage list on hover/detail, delete refused when used.
- **Users** (admin only): list, invite with temporary password, role, disable.

Interaction rules (from ui-ux-pro-max UX guidelines, applied): visible labels, validate on blur, inline error under field with `aria-describedby`, focusable error summary on failed submit, success toast on save, confirm only destructive actions (in-app modal, never native dialogs), multi-select bulk actions, keyboard alternative for every drag reorder, 44 px minimum targets, visible focus ring, reduced-motion respected, tables scroll horizontally below 768 px.

## 9. Constraints

- Node 22, pnpm 10, PostgreSQL 16 (local Homebrew for dev; any Postgres via `DATABASE_URL`).
- No Docker on the dev machine; local dev uses Homebrew Postgres and `.env` files.
- The user's global coding rules apply: immutability, small files (< 400 lines typical), named constants, schema validation at boundaries, no native dialogs, no filler UI text, commit messages `<type>: <description>` with no AI attribution.
- Secrets only via env; `.env.example` for all three apps. Test-only switches `TODAY_OVERRIDE` and `NEXT_IMAGE_UNOPTIMIZED` are ignored when `NODE_ENV=production`.
- 80 % test coverage target: API unit + e2e (supertest against a test database), admin component tests (Vitest + Testing Library) and one Playwright CRUD flow, web Playwright visual regression + axe accessibility pass.

## 10. Left to the builder

- Exact Prisma schema syntax, migration naming, module folder layout inside the Nest conventions.
- Tailwind v4 token file organisation, as long as every prototype value is a named token and no raw hex appears in components.
- Pagination sizes, table column widths, toast library choice.
- How the seed script reads the prototype data (hand-converted JSON is fine).
- Admin empty states, loading skeletons and the ⌘K palette's ranking.
- Playwright diff masking strategy for areas that legitimately differ (none expected with the shared seed; document any exception).

## 11. Open decisions for the user

1. Public site on Next.js (recommended, chosen above) or a plain Vite React SPA.
2. Confirm "no enquiry form" for this build.
3. Hosting target. The admin and API must be same-site for cookie auth (see section 4); say if that is not possible and the auth design changes to header tokens.
4. R2: a new Art Houz bucket (chosen above) or the existing FindMyPlots bucket.
5. Old arthouz.com URLs: do indexed pages need per-record 301s? If yes, supply the old URL list and a `legacyPath` field is added to exhibitions and artists.

## Deviations recorded during build

The visual harness (`apps/web/tests/visual/normalise.ts`) patches a copy of the prototype before comparing it with the build. Each patch records a place where the build intentionally differs from the prototype. Details: `apps/web/reference/README.md`.

- **(a) Artist order.** The prototype lists artists in a hand-ordered array; the build orders them by the API's collation (`GET /public/artists`), so the reference is rewritten to match. Reason: the order is data owned by the API, not a hand-kept list.
- **(b) News order.** The prototype's news array has a fixed order; the build follows the order returned by `GET /public/news`. Reason: same as (a).
- **(c) Home press.** The prototype's home page shows `AH_NEWS.slice(1, 4)`; the build shows the three latest items (`slice(0, 3)`). Reason: home shows the three latest items.
- **(d) Read article link.** The prototype always renders "Read article ↗"; the build renders it only when the news item has an `externalUrl`. Reason: the seed has no external URLs, so the link would go nowhere.
- **(e) Artist base.** The prototype derives an artist's base city with a signed shift `(h >> 3)`, which goes negative for some names (e.g. Vijay Pichumani) and yields "practice in undefined"; the build uses the unsigned shift `>>>`. Reason: the prototype formula is a bug; the seed already uses the unsigned shift.
- **(f) Publications link.** The prototype always renders "View more ↗" on the About publications tab; the build renders it only when the publications setting has an `externalUrl`. Reason: same as (d).
- **(g) Image-slot frame size.** The prototype's `image-slot.js` reads `clientWidth/clientHeight`, which round to integers; the build crops against the fractional box (`getBoundingClientRect`). Reason: a 251.25 px frame was cropped as 251 px, leaving the image 0.3 px too tall at 375 px width.

Other recorded departures (see "Port notes" in the reference README): the home upcoming-band image keeps the prototype's 3:2 slot; contrast of the prototype's rust (#B4651A) on paper (3.63:1) is kept, so the accessibility suite allows exactly that pair; `/api/search` and `/public/search` have no rate limit of their own and must be throttled at the proxy (see `docs/deploy.md`).
