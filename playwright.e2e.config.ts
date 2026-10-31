/**
 * Admin publish-flow E2E on the single Next.js server (CMS at /admin, API at /api, site at /).
 *
 * Needs, and starts on its own (reuseExistingServer is false, so the port must be free):
 *   - Postgres 16+ on localhost:5433 with the database `arthouz_next_test_e2e` (pg_trgm available).
 *     Override with E2E_DATABASE_URL. The database is wiped (schema dropped) on every run.
 *   - One production server on 3102 (E2E_PORT). The dev server (3300) and the visual harness (3100) are left alone.
 *   - Google Chrome installed (channel 'chrome'); browsers are never downloaded.
 * `next build` writes .next, which the visual harness (playwright.config.ts) also builds into: never run the two
 * at the same time.
 */
import { defineConfig } from '@playwright/test'
import { ADMIN_URL, E2E_DATABASE_URL, E2E_JWT_SECRET, E2E_PORT, E2E_TODAY, SEED_ADMIN, WEB_URL } from './tests/e2e/fixtures'

const SERVER_START_TIMEOUT_MS = 300_000
const TEST_TIMEOUT_MS = 90_000
const ACTION_TIMEOUT_MS = 10_000

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/playwright-e2e',
  timeout: TEST_TIMEOUT_MS,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    channel: 'chrome',
    baseURL: ADMIN_URL,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    actionTimeout: ACTION_TIMEOUT_MS,
    trace: 'retain-on-failure',
  },
  webServer: {
    // Wipe the schema, migrate, seed, build, serve. The seed's picsum images are never fetched by the test.
    command: [
      `echo 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;' | pnpm exec prisma db execute --stdin`,
      'pnpm exec prisma migrate deploy',
      'pnpm db:seed',
      'pnpm exec next build',
      `pnpm exec next start --port ${E2E_PORT}`,
    ].join(' && '),
    url: WEB_URL,
    reuseExistingServer: false,
    timeout: SERVER_START_TIMEOUT_MS,
    stdout: 'ignore',
    stderr: 'pipe',
    // Every database and storage variable is set here so nothing from .env leaks in.
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      DIRECT_DATABASE_URL: E2E_DATABASE_URL,
      STORAGE_DRIVER: 'memory',
      TODAY_OVERRIDE: E2E_TODAY,
      JWT_SECRET: E2E_JWT_SECRET,
      SEED_ADMIN_EMAIL: SEED_ADMIN.email,
      SEED_ADMIN_PASSWORD: SEED_ADMIN.password,
      NEXT_PUBLIC_SITE_URL: WEB_URL,
      NEXT_IMAGE_UNOPTIMIZED: '1',
      // next start forces NODE_ENV=production; opt in to the frozen date and unoptimised images.
      ALLOW_TEST_OVERRIDES: '1',
    },
  },
})
