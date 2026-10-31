# Deploying Art Houz

One Next.js process serves the site (`/`), the CMS (`/admin`) and the API (`/api`). It needs one PostgreSQL database and one S3-compatible bucket (the server writes, browsers read). Every environment variable is listed in the README.

## Build and run (Node host)

1. `pnpm install --frozen-lockfile`
2. `pnpm exec prisma generate`: the Prisma client is generated into `lib/server/generated` and is not committed, so run it on every fresh checkout.
3. `pnpm db:migrate` (`prisma migrate deploy`) against the production database. It needs the `pg_trgm` extension (created by the first migration; the role needs permission to create it, or create it beforehand). Use `DIRECT_DATABASE_URL` for a non-pooled connection.
4. `pnpm build` with `NEXT_PUBLIC_SITE_URL` set to the public origin. The build fails if it is unset or a localhost URL. Pages are prerendered from the database, so `DATABASE_URL`, `JWT_SECRET` and `SEED_ADMIN_*` must be set for the build too, and so must `STORAGE_DRIVER` (or the five R2 variables, since production defaults to `r2`): the environment is parsed when `next build` imports the server modules. Changing `NEXT_PUBLIC_SITE_URL` needs a rebuild.
5. `pnpm start` (port 3300), under pm2 as a single process: `pm2 start pnpm --name arthouz -- start`.
6. First deployment only: `pnpm db:seed`, then `pnpm media:rehome` with `STORAGE_DRIVER=r2` to move the placeholder images into the bucket. Restart afterwards to refresh cached pages.

Build and deploy need devDependencies installed (`prisma`, `tsx`, `typescript`, `@tailwindcss/postcss`); do not install with `--prod`.

`lib/server/env.ts` exits at startup with the list of invalid keys if validation fails.

## Reverse proxy and cookies

- Terminate HTTPS at the proxy and forward everything to port 3300. The `ah_session` cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production, 7 days, host-only.
- The CMS and API are same-origin, so there is no CORS setup. Write requests (POST, PUT, PATCH, DELETE) with an `Origin` header that differs from the request origin get `403 BAD_ORIGIN`.
- Set `TRUST_PROXY=1` (hop count) behind one proxy, otherwise the per-IP login limit (5 attempts per minute, stored in Postgres) sees the proxy's address for every client. The proxy must overwrite `X-Forwarded-For`, never pass a client value through.
- Uploads: allow bodies of at least 200 MB on `POST /api/media` (nginx: `client_max_body_size 200m;`) and timeouts of 600 s (`client_body_timeout 600s; proxy_read_timeout 600s; proxy_send_timeout 600s;`). The route allows 600 s. Uploads are buffered in memory, so the server answers more than two concurrent uploads with 429 `TOO_MANY_UPLOADS`; add a per-server connection limit on `/api/media` at the proxy as well.
- `/api/search` has no rate limit of its own and rejects queries over 120 characters; throttle it at the proxy.

## Object storage (R2)

- Uploads go through the server: images (JPEG, PNG, WebP, AVIF, up to 25 MB) are stored as the original plus a 480 px WebP thumbnail; videos (MP4, WebM, MOV, up to 200 MB) as a single object. No presigned uploads yet, so the bucket needs no CORS rule today.
- The bucket must be publicly readable at `AWS_S3_PUBLIC_URL`. Objects are written with `Cache-Control: public, max-age=31536000, immutable`. Set `IMAGE_HOST` to that URL's hostname.
- The access key only needs read, write and delete on this bucket.

## Never set in production

`TODAY_OVERRIDE`, `ALLOW_TEST_OVERRIDES`, `NEXT_IMAGE_UNOPTIMIZED`, `DATABASE_URL_TEST` and the `VISUAL_*` / `E2E_*` variables. They freeze dates, disable image optimisation or point at test databases.

## Vercel

Works for the site, CMS and API. Media uploads above 4.5 MB fail because of Vercel's request body limit until presigned browser-to-bucket uploads are built; that also needs a CORS rule on the R2 bucket. Run `prisma migrate deploy` and `prisma generate` in the build step.

- Set `TRUST_PROXY=1`: Vercel sits behind one proxy, and without it every client shares one login-throttle bucket.
- `app/api/media/route.ts` sets `maxDuration = 600`, which exceeds the Hobby plan's function limit. Use a plan that allows it or lower the value.
- The build step needs the same environment as a Node host build, including `STORAGE_DRIVER` or the R2 variables, and devDependencies installed.
