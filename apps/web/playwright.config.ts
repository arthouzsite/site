import { defineConfig } from '@playwright/test'
import { API_DIR, SEED_ADMIN, VISUAL_API_PORT, VISUAL_DATABASE_URL, VISUAL_WEB_PORT, VISUAL_REVALIDATE_SECRET, VISUAL_TODAY } from './tests/visual/env'

const API_PORT = VISUAL_API_PORT
const WEB_PORT = VISUAL_WEB_PORT
const SERVER_START_TIMEOUT_MS = 240_000
const TEST_TIMEOUT_MS = 120_000
const VISUAL_JWT_SECRET = 'visual-test-jwt-secret-at-least-32-characters'

export default defineConfig({
  testDir: './tests/visual',
  outputDir: './test-results/playwright',
  timeout: TEST_TIMEOUT_MS,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  globalSetup: './tests/visual/global-setup.ts',
  use: {
    channel: 'chrome',
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
  },
  webServer: [
    {
      // Migrate + seed first: Playwright starts webServers before globalSetup, and the web
      // readiness probe renders the footer, which needs seeded settings and locations.
      command: 'pnpm exec prisma migrate deploy && pnpm exec tsx prisma/seed.ts && pnpm run build && node dist/main.js',
      cwd: API_DIR,
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: false,
      timeout: SERVER_START_TIMEOUT_MS,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        DATABASE_URL: VISUAL_DATABASE_URL,
        STORAGE_DRIVER: 'memory',
        TODAY_OVERRIDE: VISUAL_TODAY,
        PORT: String(API_PORT),
        WEB_URL: `http://localhost:${WEB_PORT}`,
        REVALIDATE_SECRET: VISUAL_REVALIDATE_SECRET,
        JWT_SECRET: process.env.JWT_SECRET ?? VISUAL_JWT_SECRET,
        SEED_ADMIN_EMAIL: SEED_ADMIN.email,
        SEED_ADMIN_PASSWORD: SEED_ADMIN.password,
      },
    },
    {
      // Production build: deterministic (no HMR/dev overlay). Static pages fetch the API at build
      // time, so wait for it first. NEXT_IMAGE_UNOPTIMIZED applies under `next start` only with ALLOW_TEST_OVERRIDES=1.
      command: `until curl -sf http://localhost:${API_PORT}/health >/dev/null; do sleep 1; done && pnpm exec next build && pnpm exec next start --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: SERVER_START_TIMEOUT_MS,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        API_URL: `http://localhost:${API_PORT}`,
        NEXT_IMAGE_UNOPTIMIZED: '1',
        NEXT_PUBLIC_SITE_URL: `http://localhost:${WEB_PORT}`,
        REVALIDATE_SECRET: VISUAL_REVALIDATE_SECRET,
        TODAY_OVERRIDE: VISUAL_TODAY,
        // next start forces NODE_ENV=production; opt in to the frozen date (footer year) and unoptimised images.
        ALLOW_TEST_OVERRIDES: '1',
      },
    },
  ],
})
