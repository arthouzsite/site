# Services section — design and plan

Date: 2026-10-30. Requested by the client in chat: "add these in services menu" with the list
`sell / for sales contact / gallery on rent / art for rent / art sales contact / we do corporate painting execution / turn key projects - art project`.
The client opted out of clarifying questions; every choice below is the builder's call unless marked **client**.

## Intent

Visitors must be able to find, from the main navigation, what Art Houz offers beyond exhibitions
(sales, rentals, commissions, turn-key projects) and how to enquire. Staff must manage those
offers in the CMS without a developer.

## Goals / non-goals / anti-goals

- Goals: a "Services" entry in the site navigation; one page per service; an index page; sales
  contact details where a service has them; CMS screen with publish control and ordering; seeded
  with the client's list so it is live immediately.
- Non-goals: an enquiry form (none exists on the site; the Enquire button keeps pointing at
  `/visit` or a per-service link); payments; moving the About "Framing Services" tab (it stays).
- Anti-goals: anything that changes the existing nine screens' pixels except the navigation
  gaining one item; prototype tokens and clamp values stay exact.

## Content model (`Service`, Prisma)

| field | type | notes |
| --- | --- | --- |
| id, slug (unique), title | as other entities | slug via `uniqueSlug` |
| summary | String, default "" | one or two sentences, shown on the index and under the title |
| body | String, default "" | long text, paragraphs separated by blank lines (rendered as `<p>`s) |
| imageId | Media? (IMAGE only via `assertMediaExists`) | 3:2 slot like About |
| ctaLabel | String, default "Enquire →" | **client wording family** matches the About tab |
| ctaHref | String, default "" | empty → `/visit`; otherwise http(s) URL, `mailto:` or `tel:` (shared schema) |
| contactName, contactPhone, contactEmail | String, default "" | the "sales contact" lines; phone uses the shared `TEL_PATTERN`, email `z.email()` |
| sortOrder, isPublished, createdAt, updatedAt | as Fair | |

Shared (`packages/shared`): `serviceInputSchema`, `servicePatchSchema`, `publicServiceSchema`,
`publicServiceListSchema`; `TagEntity` gains `'service'` → tags `['home','search','services', 'service:<slug>']`.

## API (`apps/api`)

- Admin (auth + roles as Fairs; EDITOR may write): `GET/POST /services`, `GET/PATCH/DELETE /services/:id`,
  `PATCH /services/:id/publish` (`{ isPublished }`), `PUT /services/order` (`{ ids }`), same envelope,
  slug rules, media guard and revalidation fan-out as Fairs/News.
- Public: `GET /public/services` (published, by sortOrder) and `GET /public/services/:slug`
  (404 when unpublished); search adds a "Services" group.
- Media usage: `findMediaUsage` counts service images. Migration additive.
- Seed (`seed-data/services.json`, published, in this order): **client list** →
  1. `art-sales` "Art sales" — summary from "sell", contact fields left empty but shown when set
     (the two "sales contact" lines); 2. `gallery-on-rent` "Gallery on rent"; 3. `art-for-rent`
     "Art for rent"; 4. `corporate-painting-execution` "Corporate painting execution";
     5. `turn-key-art-projects` "Turn-key art projects". Bodies are short placeholder copy the
     client replaces in the CMS (no invented facts, no prices, no phone numbers).

## Website (`apps/web`)

- `lib/nav.ts`: "Services" between "News" and "About" in `NAV_ITEMS` and `FOOTER_NAV`.
  Desktop header: the Services item is a link to `/services` that also opens a dropdown on
  hover/focus listing published services (fetched server-side with tag `services`); keyboard:
  Enter follows the link, ArrowDown enters the list, Escape closes. Mobile menu: "Services" link
  followed by an indented list of the published services.
- `/services`: index. Same rhythm as the About Services tab: one image-and-text row per service
  (image 3:2, title, summary, "Read more →" text link), alternating image side on desktop,
  `font-display` titles, existing `Container`/section spacing.
- `/services/[slug]`: title, summary, and the image (3:2) beside them in the same row rhythm as the
  index, then body paragraphs, contact block (name, `tel:` and `mailto:` links via the shared helpers) when any
  contact field is set, `PrimaryButton` with `ctaLabel` → `ctaHref || '/visit'`. `notFound()`
  when the API returns 404. Metadata via `detailMetadata`. Sitemap entries. Fetch tags
  `[services, service:<slug>]` + the list page `[services]`.
- Search overlay shows the Services group (API change above). a11y suite: add `/services` and
  `/services/art-sales`; 44 px hit areas; no new axe violations.
- No pixel baseline exists for these pages: verify with unit tests + the a11y suite + a manual
  screenshot at 375/1440 saved to the task report.

## CMS (`apps/admin`)

- Sidebar item "Services" (icon reuse), route `/services` (list with drag/keyboard reorder,
  publish switch, search) and `/services/:id` + `/services/new` (editor: title, slug, summary,
  body textarea, image picker (image-only), CTA label + link, contact name/phone/email, publish
  card), breadcrumbs via `useBreadcrumb`, ⌘K palette group "Services", MSW handlers + tests,
  mirroring the Fairs feature file-for-file. No filler copy.

## Plan (three tasks)

- **S1 (API + shared + seed, Sonnet, on the main checkout):** schema + migration, shared
  schemas/tags, services module (controller/service/mapper/module), public endpoints + search
  group, media usage, revalidation, seed data, docs (README/deploy tables unchanged except the
  new seed line). Tests: unit for service/mapper, e2e for CRUD/publish/order/public/search/
  media-kind guard/unpublished 404. `pnpm --filter @arthouz/api test:cov && test:e2e`, `pnpm
  --filter @arthouz/shared test`, `pnpm build:shared`. Commit `feat(api): services`.
- **S2 (website, Sonnet, worktree) and S3 (admin, Sonnet, worktree) in parallel after S1 merges**,
  each with unit tests + lint + typecheck; S2 also runs the a11y suite on the new routes
  (`pnpm --filter @arthouz/web test:a11y --grep services` or the whole suite) and attaches
  screenshots. Commits `feat(web): services section` and `feat(admin): services screen`.
- Review: each task reviewed (Sonnet; S2 on Opus because it adds navigation to the exact-port
  site), fix rounds as needed, then `pnpm verify` on the merged tip.
