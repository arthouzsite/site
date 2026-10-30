# Deploying Art Houz

Three processes share one PostgreSQL database (api only) and one object-storage bucket (api writes, browsers read).

## Build and run

| App | Build | Output | Run |
| --- | --- | --- | --- |
| `apps/api` | `pnpm build:shared && pnpm --filter @arthouz/api build` (`prisma generate && nest build`) | `apps/api/dist` | `prisma migrate deploy`, then `node dist/main.js` from `apps/api` |
| `apps/web` | `pnpm build:shared && pnpm --filter @arthouz/web build` (`next build`) | `apps/web/.next` | `next start --port 3100` from `apps/web` |
| `apps/admin` | `pnpm build:shared && pnpm --filter @arthouz/admin build` (`tsc --noEmit && vite build`) | `apps/admin/dist` (static files) | Serve with any static host; route unknown paths to `index.html` (client-side routing) |

Order matters:

1. Run `pnpm --filter @arthouz/api exec prisma migrate deploy` against the production `DATABASE_URL` before starting a new API version. The database needs the `pg_trgm` extension (created by the first migration; the database role needs permission to create it, or create it beforehand).
2. Start the API and wait for `GET /health`.
3. Build the web app after the API is reachable at `API_URL`: static pages fetch API data during `next build`. Pages that cannot reach the API at build time are rendered per request instead.

`apps/api` reads `.env` from its working directory (dotenv) and exits at startup with the list of invalid keys if validation fails. `apps/web` reads `API_URL`, `REVALIDATE_SECRET` and `IMAGE_HOST` when it starts or builds and `NEXT_PUBLIC_SITE_URL` on the server at runtime. The admin build bakes `VITE_*` values into the bundle, so rebuild it when they change.

## Environment

Secrets are marked **secret**; keep them out of the repository and out of the admin bundle. Every key has an example in the app's `.env.example`.

### apps/api

| Key | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | yes in production | Set to `production`: this makes the session cookie `Secure` and disables `TODAY_OVERRIDE` |
| `PORT` | no | Default 4100 |
| `DATABASE_URL` | yes | PostgreSQL connection string. **secret** |
| `JWT_SECRET` | yes | At least 32 characters. Signs the session cookie. **secret** |
| `ADMIN_ORIGIN` | no (default `http://localhost:5180`) | Exact admin origin: scheme, host and port, no trailing slash. Used for CORS and the `Origin` check on write requests. Set it explicitly in production |
| `WEB_URL` | no (default `http://localhost:3100`) | Origin of the public site; the API POSTs `{WEB_URL}/api/revalidate` here. Allowed by CORS. Set it explicitly in production |
| `REVALIDATE_SECRET` | yes | Sent as `x-revalidate-secret`. Must equal the web app's value. **secret** |
| `STORAGE_DRIVER` | no | `r2` (default outside tests) or `memory`. Use `r2` in production |
| `S3_ENDPOINT` | with `r2` | S3 API endpoint, e.g. `https://<account-id>.r2.cloudflarestorage.com` |
| `AWS_ACCESS_KEY_ID` | with `r2` | **secret** |
| `AWS_SECRET_ACCESS_KEY` | with `r2` | **secret** |
| `AWS_S3_BUCKET_NAME` | with `r2` | |
| `AWS_S3_PUBLIC_URL` | with `r2` | Public base URL of the bucket. Image URLs stored in the database are `{AWS_S3_PUBLIC_URL}/{key}` |
| `SEED_ADMIN_EMAIL` | yes | Validated at API startup as well as by the seed script. Seed-only in practice |
| `SEED_ADMIN_PASSWORD` | yes | Same. **secret** |
| `TODAY_OVERRIDE` | never in production | `YYYY-MM-DD`; test-only |
| `DATABASE_URL_TEST` | never in production | API e2e tests only |

`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are required by the API's environment schema, so the API will not start without them. Run `db:seed` once for a new database; it creates the admin user and loads the prototype content. Then run `pnpm --filter @arthouz/api media:rehome` with the production R2 keys so every seeded image is served from the bucket instead of the placeholder host.

### apps/web

| Key | Required | Notes |
| --- | --- | --- |
| `API_URL` | yes | Base URL of the API, reachable from the web server |
| `REVALIDATE_SECRET` | yes | Must equal the API's value. **secret** |
| `NEXT_PUBLIC_SITE_URL` | yes in production | Public origin of the site (canonical URLs, sitemap, robots). Default is `http://localhost:3100` |
| `IMAGE_HOST` | recommended | Hostname of `AWS_S3_PUBLIC_URL`; added to the `next/image` allow-list. Without it, bucket images are rejected by the optimiser |
| `TODAY_OVERRIDE`, `NEXT_IMAGE_UNOPTIMIZED`, `ALLOW_TEST_OVERRIDES` | never in production | Visual-harness switches |

### apps/admin (build time)

| Key | Notes |
| --- | --- |
| `VITE_API_URL` | Base URL of the API. Default `http://localhost:4100` |
| `VITE_WEB_URL` | Public site origin; builds "view on site" links in the exhibition screens. Default `http://localhost:3100` |
| `VITE_PUBLIC_SITE_URL` | Target of the sidebar's public-site link. Default `/` |

## Never set in production

`TODAY_OVERRIDE`, `ALLOW_TEST_OVERRIDES`, `NEXT_IMAGE_UNOPTIMIZED` (and `DATABASE_URL_TEST`, `VISUAL_*`). They freeze dates or disable image optimisation. The API ignores `TODAY_OVERRIDE` when `NODE_ENV=production`; the web app ignores both `TODAY_OVERRIDE` and `NEXT_IMAGE_UNOPTIMIZED` unless `ALLOW_TEST_OVERRIDES=1`, which is why it must also be unset.

## Object storage (R2)

- Uploads are proxied through the API: the admin POSTs a multipart file to the API (images: JPEG, PNG, WebP or AVIF up to 25 MB; videos: MP4, WebM or MOV up to 200 MB). Images are stored as the original plus a 480 px WebP thumbnail with `PutObject`; videos are stored as a single object with no poster frame (the admin renders the video itself, and width/height are stored as 0). There are no presigned uploads, so the bucket needs no CORS rule for the admin origin.
- The bucket must be publicly readable at `AWS_S3_PUBLIC_URL` (R2 public bucket or custom domain): the site and admin load images directly from that URL. Objects are written with `Cache-Control: public, max-age=31536000, immutable`.
- Set `IMAGE_HOST` on the web app to the hostname of `AWS_S3_PUBLIC_URL`.
- The access key only needs read/write/delete on this bucket.

## Reverse proxy and cookies

- Admin session: the API sets an `ah_session` cookie (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` when `NODE_ENV=production`, 7 days, no `Domain`, so it is host-only for the API host). The admin calls the API with `credentials: 'include'`.
- `SameSite=Lax` means the admin and the API must be same-site, for example `admin.example.com` and `api.example.com`, or `/api` proxied under the admin origin. Different registrable domains will not send the cookie. Serve everything over HTTPS in production, because the cookie is `Secure`.
- `ADMIN_ORIGIN` must match the browser's `Origin` header for the admin exactly (`https://admin.example.com`, no trailing slash). Write requests (POST, PUT, PATCH, DELETE) carrying any other `Origin` get `403 BAD_ORIGIN`. CORS allows `ADMIN_ORIGIN` and `WEB_URL` with credentials.
- Revalidation: after content changes the API POSTs `{WEB_URL}/api/revalidate` with header `x-revalidate-secret: $REVALIDATE_SECRET` and body `{ "tags": [...] }`. `WEB_URL` must be reachable from the API host, and `REVALIDATE_SECRET` must be identical in the API and web environments. Failures are logged as warnings and do not fail the admin request, so a wrong secret shows up as stale site content, not as an error.
- Rate limits: only `POST /auth/login` is throttled (5 per minute). `/public/search` (API) and `/api/search` (web proxy route) have no rate limit; throttle both at the proxy before launch. `/api/search` rejects queries over 120 characters.
- Upload size: the reverse proxy must allow request bodies of at least 200 MB on `POST /media` (for nginx, `client_max_body_size 200m;`), with request and read timeouts long enough for slow uploads. The API itself enforces 200 MB for videos and 25 MB for images; a proxy limit below 200 MB surfaces in the admin as a 413 on videos.
- Upload concurrency and timeout: uploads are buffered in memory, so the API allows at most 2 concurrent `POST /media` requests and answers the rest with 429 `TOO_MANY_UPLOADS` (the admin also uploads its queue one file at a time). Back this up at the proxy with a per-IP or per-server connection limit on `POST /media` (for nginx, `limit_conn` in the `/media` location) and a request timeout of at least 600 s so a 200 MB upload on a slow link is not cut off (`client_body_timeout 600s; proxy_read_timeout 600s; proxy_send_timeout 600s;`). The API sets its own `requestTimeout` to 600 s in `apps/api/src/main.ts`.
- Proxy headers: the API does not set Express `trust proxy`, so the login throttle sees the proxy's address unless the proxy and API share a network layer that preserves client IPs. Check this before relying on the per-IP login limit.
