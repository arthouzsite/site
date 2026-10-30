import { userInfo } from 'node:os'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'

export const ADMIN_ROOT = fileURLToPath(new URL('..', import.meta.url))
export const API_DIR = path.join(ADMIN_ROOT, '..', 'api')
export const WEB_DIR = path.join(ADMIN_ROOT, '..', 'web')

// Dedicated ports so a run never collides with the dev servers (4200/3200/5181) or the web visual harness (4100/3100).
export const E2E_API_PORT = Number(process.env.E2E_API_PORT ?? 4102)
export const E2E_WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3102)
export const E2E_ADMIN_PORT = Number(process.env.E2E_ADMIN_PORT ?? 5182)
export const API_URL = `http://localhost:${E2E_API_PORT}`
export const WEB_URL = `http://localhost:${E2E_WEB_PORT}`
export const ADMIN_URL = `http://localhost:${E2E_ADMIN_PORT}`

// Prisma's CLI does not fall back to the OS user like libpq does, so the default names it explicitly.
const DEFAULT_DATABASE_URL = `postgresql://${encodeURIComponent(userInfo().username)}@localhost:5433/arthouz_test_e2e`
const E2E_DATABASE_SUFFIX = '_e2e'

/** The API webServer drops the whole public schema, so refuse any database not explicitly named for e2e. */
function resolveE2eDatabaseUrl(rawUrl: string): string {
  let databaseName: string
  try {
    databaseName = decodeURIComponent(new URL(rawUrl).pathname.replace(/^\//, ''))
  } catch {
    throw new Error('E2E_DATABASE_URL is not a valid database URL.')
  }
  if (!databaseName.endsWith(E2E_DATABASE_SUFFIX)) {
    throw new Error(
      `Refusing to run e2e: the database "${databaseName}" does not end in "${E2E_DATABASE_SUFFIX}". ` +
        'The e2e run drops the public schema; point E2E_DATABASE_URL at a throwaway database such as arthouz_test_e2e.',
    )
  }
  return rawUrl
}

export const E2E_DATABASE_URL = resolveE2eDatabaseUrl(process.env.E2E_DATABASE_URL ?? DEFAULT_DATABASE_URL)

// Harness constants for a throwaway database; never real credentials.
export const E2E_TODAY = '2026-10-30'
export const E2E_REVALIDATE_SECRET = 'e2e-test-revalidate-secret'
export const E2E_JWT_SECRET = 'e2e-test-jwt-secret-at-least-32-characters'
export const SEED_ADMIN = { email: 'e2e-admin@example.com', password: 'e2e-admin-password' } as const

export const HERO_FILE_NAME = 'salt-line-hero.jpg'
export const HERO_ALT = 'Salt Line, installation view'

const HERO_WIDTH = 1200
const HERO_HEIGHT = 800
const HERO_BACKGROUND = { r: 188, g: 172, b: 150 }

type SharpFactory = (options: {
  create: { width: number; height: number; channels: 3; background: { r: number; g: number; b: number } }
}) => { jpeg: (options: { quality: number }) => { toBuffer: () => Promise<Buffer> } }

/** A small valid JPEG, generated with the API's own sharp so no binary fixture is committed. */
export async function makeHeroJpeg(): Promise<Buffer> {
  const sharp = createRequire(path.join(API_DIR, 'package.json'))('sharp') as SharpFactory
  return sharp({ create: { width: HERO_WIDTH, height: HERO_HEIGHT, channels: 3, background: HERO_BACKGROUND } })
    .jpeg({ quality: 60 })
    .toBuffer()
}

export async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(SEED_ADMIN.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(SEED_ADMIN.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => url.pathname !== '/login')
}
