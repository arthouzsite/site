import { userInfo } from 'node:os'
import sharp from 'sharp'
import type { Page } from '@playwright/test'

// A dedicated port so a run never collides with the dev server (3300) or the visual harness (3100).
export const E2E_PORT = Number(process.env.E2E_PORT ?? 3102)
export const WEB_URL = `http://localhost:${E2E_PORT}`
export const ADMIN_URL = `${WEB_URL}/admin`
export const API_URL = `${WEB_URL}/api`

// Prisma's CLI does not fall back to the OS user like libpq does, so the default names it explicitly.
const DEFAULT_DATABASE_URL = `postgresql://${encodeURIComponent(userInfo().username)}@localhost:5433/arthouz_next_test_e2e`
const E2E_DATABASE_SUFFIX = '_e2e'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/** The webServer drops the whole public schema, so refuse any database not explicitly named for e2e. */
function resolveE2eDatabaseUrl(rawUrl: string): string {
  let databaseName: string
  let hostName: string
  try {
    const url = new URL(rawUrl)
    databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))
    hostName = url.hostname
  } catch {
    throw new Error('E2E_DATABASE_URL is not a valid database URL.')
  }
  if (!LOCAL_HOSTS.has(hostName) || !databaseName.endsWith(E2E_DATABASE_SUFFIX)) {
    throw new Error(
      `Refusing to run e2e: "${databaseName}" on host "${hostName}" is not a local database ending in "${E2E_DATABASE_SUFFIX}". ` +
        'The e2e run drops the public schema; point E2E_DATABASE_URL at a throwaway database such as arthouz_next_test_e2e.',
    )
  }
  return rawUrl
}

export const E2E_DATABASE_URL = resolveE2eDatabaseUrl(process.env.E2E_DATABASE_URL ?? DEFAULT_DATABASE_URL)

// Harness constants for a throwaway database; never real credentials.
export const E2E_TODAY = '2026-10-30'
export const E2E_JWT_SECRET = 'e2e-test-jwt-secret-at-least-32-characters'
export const SEED_ADMIN = { email: 'e2e-admin@example.com', password: 'e2e-admin-password' } as const

export const HERO_FILE_NAME = 'salt-line-hero.jpg'
export const HERO_ALT = 'Salt Line, installation view'

const HERO_WIDTH = 1200
const HERO_HEIGHT = 800
const HERO_BACKGROUND = { r: 188, g: 172, b: 150 }

/** A small valid JPEG, generated with sharp so no binary fixture is committed. */
export function makeHeroJpeg(): Promise<Buffer> {
  return sharp({ create: { width: HERO_WIDTH, height: HERO_HEIGHT, channels: 3, background: HERO_BACKGROUND } })
    .jpeg({ quality: 60 })
    .toBuffer()
}

export async function signIn(page: Page): Promise<void> {
  await page.goto(`${ADMIN_URL}/login`)
  await page.getByLabel('Email').fill(SEED_ADMIN.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(SEED_ADMIN.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => url.pathname !== '/admin/login')
}
