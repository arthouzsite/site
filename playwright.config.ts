import { defineConfig } from '@playwright/test'
import { SEED_ADMIN, VISUAL_DATABASE_URL, VISUAL_WEB_PORT, VISUAL_TODAY } from './tests/visual/env'

const WEB_PORT = VISUAL_WEB_PORT
const SERVER_START_TIMEOUT_MS = 300_000
const TEST_TIMEOUT_MS = 120_000
const VISUAL_JWT_SECRET = 'visual-test-jwt-secret-at-least-32-characters'

export default defineConfig({
  // Visual comparisons and the accessibility pass share the harness server; unit tests (vitest) live in tests/unit.
  testDir: './tests',
  testMatch: ['visual/**/*.spec.ts', 'a11y/**/*.spec.ts'],
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
  webServer: {
    // Migrate + seed before the build: static pages read the database while prerendering, and the
    // readiness probe renders the footer, which needs seeded settings and locations. Production build:
    // deterministic (no HMR/dev overlay).
    command: `pnpm exec prisma migrate deploy && pnpm exec tsx prisma/seed.ts && pnpm exec next build && pnpm exec next start --port ${WEB_PORT}`,
    url: `http://localhost:${WEB_PORT}`,
    reuseExistingServer: false,
    timeout: SERVER_START_TIMEOUT_MS,
    stdout: 'ignore',
    stderr: 'pipe',
    // Every database and storage variable is set here so nothing from .env (loaded by tests/visual/env.ts) leaks in.
    env: {
      DATABASE_URL: VISUAL_DATABASE_URL,
      DIRECT_DATABASE_URL: VISUAL_DATABASE_URL,
      STORAGE_DRIVER: 'memory',
      TODAY_OVERRIDE: VISUAL_TODAY,
      JWT_SECRET: VISUAL_JWT_SECRET,
      SEED_ADMIN_EMAIL: SEED_ADMIN.email,
      SEED_ADMIN_PASSWORD: SEED_ADMIN.password,
      NEXT_PUBLIC_SITE_URL: `http://localhost:${WEB_PORT}`,
      NEXT_DIST_DIR: '.next-visual',
      NEXT_IMAGE_UNOPTIMIZED: '1',
      // next start forces NODE_ENV=production; opt in to the frozen date (footer year) and unoptimised images.
      ALLOW_TEST_OVERRIDES: '1',
    },
  },
})
