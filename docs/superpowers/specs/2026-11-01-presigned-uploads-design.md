# Presigned media uploads — design

Date: 2026-11-01. Production runs on Vercel (`https://site-arthouz.vercel.app`), whose request-body
limit (4.5 MB) blocks the current server-side upload for anything larger. Uploads therefore go
straight from the browser to the R2 bucket with a presigned URL; the server only authorises the
upload and records the result. Builder's decisions throughout; the client asked only for the outcome.

## Flow

1. `POST /api/media/uploads` (signed in) with `{ filename, mime, bytes, alt }`.
   Validates `mime` against the allowed image/video lists, `bytes` against the per-kind limit
   (25 MB images, 200 MB videos), `alt` with the existing rule (required, ≤ 500). Allocates the
   object key `arthouz/<yyyy>/<uuid>.<ext>` (`ext` from the mime) and returns
   `201 { key, method: 'PUT', url, headers: { 'content-type': mime }, expiresAt }`.
   - R2 driver: `url` is a presigned `PutObject` URL (15 minutes, content type signed).
   - Memory driver (tests, local without R2): `url` is `/api/media/uploads/<key>` on the same origin.
2. The browser `PUT`s the file bytes to `url` with the returned headers (XHR, progress events).
   For an absolute URL no cookies are sent; for the same-origin memory URL they are.
3. `POST /api/media/uploads/complete` (signed in) with `{ key, alt }`.
   The key must start with `arthouz/`, must not already have a `Media` row, and must exist in
   storage (`head`). The stored size and content type must satisfy the limits again.
   - Image: the object is fetched (≤ 25 MB), decoded with sharp (dimensions, thumbnail), the
     thumbnail is stored next to it, and the `Media` row is created exactly as the current
     server-side upload does. A file that sharp cannot decode is deleted from storage and the
     request fails with the existing `INVALID_IMAGE` error.
   - Video: only the first 64 KB are fetched (ranged get) and checked with the existing magic-byte
     test; failure deletes the object and returns `INVALID_VIDEO`. Row fields as today.
   Returns `201 Media`. Image processing runs inside the existing concurrency slot
   (`MAX_CONCURRENT_UPLOADS`, 429 `TOO_MANY_UPLOADS`).
4. `PUT /api/media/uploads/[...key]` exists only for the memory driver: signed in, body bounded by
   the same counting stream as today (200 MB + overhead), stored in memory storage under the key.
   With the R2 driver it answers the 404 envelope.

`POST /api/media` (server-side upload) stays for API callers and small files; the CMS no longer uses it.

## Storage interface

`Storage` gains `createUploadTarget(key, contentType, bytes)` → `{ url, method, headers, expiresAt }`,
`head(key)` → `{ bytes, contentType } | null`, `get(key)` → `Buffer`, `getRange(key, start, endInclusive)`
→ `Buffer`. `R2Storage` implements them with the AWS SDK presigner and `HeadObject`/`GetObject`
(`Range`). `MemoryStorage` implements them over its map and the local PUT route.

## CMS client

`useUploadMedia` performs the three steps; progress reports 0–0.9 during the PUT and 1 after
`complete`. A failed PUT to an absolute URL surfaces as `ApiError('UPLOAD_BLOCKED', …)` with a
message that names the storage origin, because the usual cause is a missing CORS rule. The upload
queue UI and the media picker are unchanged.

## Bucket configuration (Cloudflare dashboard, not code)

The bucket needs a CORS rule or browsers refuse the PUT:

```json
[{ "AllowedOrigins": ["https://site-arthouz.vercel.app", "http://localhost:3300"],
   "AllowedMethods": ["PUT", "GET", "HEAD"],
   "AllowedHeaders": ["content-type"],
   "ExposeHeaders": ["etag"],
   "MaxAgeSeconds": 3600 }]
```

The feature is account-agnostic: it works with the current bucket and with the new Art Houz R2
account once that bucket has a public URL (`AWS_S3_PUBLIC_URL`) and its objects are re-homed.

## Tests

- Unit: key allocation and validation, target creation per driver, complete-step guards
  (unknown key, duplicate key, size mismatch, bad signature → object deleted).
- Database specs (`tests/api/media-uploads.spec.ts`): the full three-step flow for an image and a
  video through the memory driver; oversize rejected at step 1 and at step 3; wrong mime at step 1;
  completing a key twice → 409; unauthenticated calls → 401.
- Admin unit: `useUploadMedia` three-step with MSW (same-origin and absolute URL), progress values,
  the blocked-PUT error.
- The admin publish e2e keeps uploading a hero image through the CMS (memory path end to end).

## Not in scope

Multipart/resumable uploads, upload cancellation, changing the public image host, re-homing to
the new R2 account (separate step once its public URL is known).
