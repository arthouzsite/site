# Signed R2 media URLs — design

Date: 2026-11-01. The client wants browsers to load media straight from R2 ("only R2 URLs") while
the bucket stays private (no public hostname). Therefore every media link the app emits is a
presigned `GET` URL on the R2 endpoint. Builder's decisions throughout.

## Where URLs are produced

Stored values do not change: `Media.url` / `thumbUrl` stay `/media/<key>` (environment-independent,
and the `/media` route keeps serving them as a fallback). Presentation happens at the two output
boundaries, once:

1. `route()` (`lib/server/http/route.ts`): before wrapping a handler's result in the envelope,
   pass it through `presentMediaUrls(value)`.
2. `lib/api.ts` (`apiGet` / `apiGetUncached`): pass the loader's result through the same helper
   before Zod validation (so the site's in-process reads match the API's output).

`presentMediaUrls<T>(value: T): Promise<T>` (`lib/server/media/present-urls.ts`) deep-walks
plain objects and arrays immutably and replaces every string that matches
`^/media/(arthouz/.+)$` with `await storage.publicUrlFor(key)`. It never touches other strings,
never mutates its input, and short-circuits when the driver has no signing (memory → unchanged).

## Signing

`Storage.publicUrlFor(key): Promise<string>`:
- R2: `getSignedUrl(client, new GetObjectCommand({ Bucket, Key }), { expiresIn: MEDIA_URL_TTL_SECONDS, signingDate })`
  with `signingDate` rounded DOWN to the start of the current hour. Within an hour every call
  therefore yields the identical URL, so browser and CDN caches hit; a URL stays valid for
  `MEDIA_URL_TTL_SECONDS` (default 604800 = 7 days, the SigV4 maximum) from that hour mark.
  Pages are cached ≤ 3600 s, so a page never serves a URL older than about an hour.
  Results are memoised per key for the current hour (bounded Map; cleared when the hour changes).
- Memory: returns `/media/<key>` unchanged (tests, local without R2).

`MEDIA_URL_TTL_SECONDS` is optional in `lib/server/env.ts` (integer 60–604800, default 604800).

## Next image config

`next.config.ts` `buildRemotePatterns(env)` adds the R2 host derived from `S3_ENDPOINT` and
`AWS_S3_BUCKET_NAME` (virtual-hosted form `<bucket>.<account>.r2.cloudflarestorage.com` and the
path-style endpoint host, both over https) when both are set, so `next/image` accepts the signed
URLs; confirm in `node_modules/next/dist/docs/` whether `search` must be set for query strings
(signed URLs carry `X-Amz-*` parameters) and set it to allow any query if required.

## Consequences accepted by the client

Long URLs; a given image URL changes every hour (so browser caching spans an hour, not a year);
Open Graph and sitemap image links change over time; a saved link stops working after 7 days.

## Tests

- Unit: `presentMediaUrls` (rewrites nested `url`/`thumbUrl` and arrays, leaves other strings,
  immutability, memory driver passthrough); `R2Storage.publicUrlFor` with fake credentials (no
  network): host and path contain the bucket and key, `X-Amz-Expires` equals the TTL, two calls in
  the same hour return the same string, a call with a mocked clock in the next hour differs; env
  parsing of `MEDIA_URL_TTL_SECONDS`; `buildRemotePatterns` with and without the R2 variables.
- API: an admin media list and a public exhibition response under a fake "signing" storage
  (inject a test driver through `storage.provider`) carry signed-looking URLs; the memory driver
  path keeps `/media/...` so the existing specs stay green.
- Harness: e2e, visual, a11y unchanged (memory driver).
- Manual by the controller: on the local dev server (real R2) the home page's image sources start
  with the R2 endpoint and load.

## Not in scope

Per-user access control; changing the upload flow (already direct to R2); CDN in front of R2.
