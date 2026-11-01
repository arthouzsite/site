# Private media bucket — design

Date: 2026-11-01. The client does not want a public hostname on the R2 bucket. Images (and videos)
are therefore served by the app from the private bucket, and media links become same-origin paths.
Builder's decisions throughout.

## Serving

`GET /media/[...key]` (public, no session) streams the object `key` from storage:
- `key` must match the stored-key shapes (`arthouz/seed/<name>.<ext>`, `arthouz/<yyyy>/<uuid>.<ext>`,
  `arthouz/<yyyy>/<mm>/<uuid>.<ext>`, and the `-thumb.webp` variants); anything else is 404 before
  any storage call. No directory traversal is possible because the pattern admits only `[a-z0-9-]`
  segments and a known extension.
- Response: body streamed from `storage.getStream(key)` (R2 `GetObject` body; memory driver's buffer),
  `Content-Type` from storage, `Content-Length` when known, `ETag` passed through when R2 returns one,
  `Cache-Control: public, max-age=31536000, s-maxage=31536000, immutable` (keys are content-addressed
  by uuid and never rewritten; the edge cache serves repeats), `Accept-Ranges: bytes` with `Range`
  honoured for videos (`206`, pass the header through to R2; memory driver slices).
- Missing object → 404 with the same headers minus cache (`Cache-Control: no-store`). `HEAD` is
  supported (same headers, no body).
- The route runs on the Node runtime; `export const dynamic = 'force-dynamic'` so Next never tries
  to prerender it.

## URLs

`Storage.urlFor(key)` returns `${MEDIA_URL_BASE}/${key}` with `MEDIA_URL_BASE` defaulting to `/media`
(env var optional, for a future CDN in front). `put` and the presigned `complete` therefore record
relative URLs in `Media.url` / `thumbUrl`. The memory driver returns the same shape (so the publish
e2e renders the uploaded hero through the route). `AWS_S3_PUBLIC_URL` and `IMAGE_HOST` are removed
from env and config; `next.config.ts` keeps `remotePatterns` only for the placeholder image host
used by seeds and tests, and adds `images.localPatterns` for `/media/**` if this Next version
requires it for local paths (read `node_modules/next/dist/docs/`).

The site and CMS already render `url`/`thumbUrl` verbatim; a relative path works in `next/image`,
`<img>`, `<video>` and Open Graph tags once `metadataBase` is set (it is). Sitemap and OG
image URLs are absolute via `metadataBase`; confirm `og:image` resolves to an absolute URL.

## Existing rows and the account switch

A one-off script `prisma/relink-media.ts` (run with `tsx --env-file=.env --conditions=react-server`)
rewrites every `Media.url` / `thumbUrl` from any absolute host to `${MEDIA_URL_BASE}/${key}` (and the
thumb key), verifies with `storage.head(key)` that the object exists in the configured bucket before
rewriting that row, and prints a summary. It is idempotent. The controller runs it against Neon after
the env points at the new account (whose bucket already holds all 72 objects).

## Tests

- Unit: key pattern (accepts the four shapes, rejects traversal, uppercase, unknown extensions,
  double slashes); header set; 404 path; `HEAD`; range handling with the memory driver; `urlFor`
  for both drivers.
- Database/API: `tests/api/media-serve.spec.ts` — upload through the memory flow, then `GET /media/<key>`
  returns the bytes with the right headers, `GET /media/<thumb key>` works, an unknown key is 404,
  a traversal attempt is 404 without touching storage.
- The publish e2e keeps passing (hero image now served via `/media/...`); the visual suite is
  unaffected (seed data uses the placeholder host, stubbed).
- `relink-media` unit test over a fake storage/prisma: rewrites only rows whose object exists.

## Not in scope

Signed per-user access (everything under `arthouz/` is publicly readable through the route, as it
was through the public bucket); a CDN hostname in front of the route (`MEDIA_URL_BASE` allows it later).
