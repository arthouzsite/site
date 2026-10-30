/**
 * Cross-app publish-flow E2E (admin -> API -> public web).
 *
 * Needs, and starts on its own (reuseExistingServer is false, so these must be free):
 *   - Postgres 16+ on localhost:5433 with the database `arthouz_test_e2e` (pg_trgm available).
 *     Override with E2E_DATABASE_URL. The database is wiped (schema dropped) on every run.
 *   - API on 4102, public web on 3102, admin on 5182 (E2E_API_PORT / E2E_WEB_PORT / E2E_ADMIN_PORT).
 *     The dev servers (API 4100, web 3100, admin 5180) and the web visual harness (4100/3100) are left alone.
 *   - Google Chrome installed (channel 'chrome'); browsers are never downloaded.
 * The API build writes apps/api/dist, so do not run this at the same time as the web visual suite.
 */
import { defineConfig } from '@playwright/test'
import {
  ADMIN_URL, API_DIR, API_URL, E2E_ADMIN_PORT, E2E_API_PORT, E2E_DATABASE_URL, E2E_JWT_SECRET, E2E_REVALIDATE_SECRET,
  E2E_TODAY, E2E_WEB_PORT, SEED_ADMIN, WEB_DIR, WEB_URL,
} from './e2e/fixtures'

const SERVER_START_TIMEOUT_MS = 240_000
const TEST_TIMEOUT_MS = 90_000
const ACTION_TIMEOUT_MS = 10_000

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results/playwright',
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
  webServer: [
    {
      // Wipe the schema, migrate, seed, then serve. The seed's picsum images are never fetched by the test.
      command: [
        `echo 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;' | pnpm exec prisma db execute --stdin`,
        'pnpm exec prisma migrate deploy',
        'pnpm run db:seed',
        'pnpm run build',
        'node dist/main.js',
      ].join(' && '),
      cwd: API_DIR,
      url: `${API_URL}/health`,
      reuseExistingServer: false,
      timeout: SERVER_START_TIMEOUT_MS,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        STORAGE_DRIVER: 'memory',
        TODAY_OVERRIDE: E2E_TODAY,
        PORT: String(E2E_API_PORT),
        WEB_URL,
        ADMIN_ORIGIN: ADMIN_URL,
        REVALIDATE_SECRET: E2E_REVALIDATE_SECRET,
        JWT_SECRET: E2E_JWT_SECRET,
        SEED_ADMIN_EMAIL: SEED_ADMIN.email,
        SEED_ADMIN_PASSWORD: SEED_ADMIN.password,
      },
    },
    {
      // Production build: static pages fetch the API at build time, so wait for it first.
      command: `until curl -sf ${API_URL}/health >/dev/null; do sleep 1; done && pnpm exec next build && pnpm exec next start --port ${E2E_WEB_PORT}`,
      cwd: WEB_DIR,
      url: WEB_URL,
      reuseExistingServer: false,
      timeout: SERVER_START_TIMEOUT_MS,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        API_URL,
        NEXT_IMAGE_UNOPTIMIZED: '1',
        NEXT_PUBLIC_SITE_URL: WEB_URL,
        REVALIDATE_SECRET: E2E_REVALIDATE_SECRET,
        TODAY_OVERRIDE: E2E_TODAY,
        // next start forces NODE_ENV=production; opt in to the frozen date and unoptimised images.
        ALLOW_TEST_OVERRIDES: '1',
      },
    },
    {
      command: `pnpm exec vite --port ${E2E_ADMIN_PORT} --strictPort`,
      cwd: '.',
      url: `${ADMIN_URL}/login`,
      reuseExistingServer: false,
      timeout: SERVER_START_TIMEOUT_MS,
      stdout: 'ignore',
      stderr: 'pipe',
      env: { VITE_API_URL: API_URL, VITE_WEB_URL: WEB_URL },
    },
  ],
})
