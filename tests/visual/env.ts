import { existsSync } from 'node:fs'
import { userInfo } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Not imported from paths.ts: paths.ts reads the ports below.
const WEB_ROOT = fileURLToPath(new URL('../..', import.meta.url))

const WEB_ENV_FILE = path.join(WEB_ROOT, '.env')
if (existsSync(WEB_ENV_FILE)) process.loadEnvFile(WEB_ENV_FILE)

// Prisma's CLI does not fall back to the OS user like libpq does, so the default names it explicitly.
const DEFAULT_DATABASE_URL = `postgresql://${encodeURIComponent(userInfo().username)}@localhost:5433/arthouz_next_test_web`
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
const VISUAL_DATABASE_NAME = /_web$/

/** The harness migrates, seeds and rewrites settings, so refuse anything that is not a local database named for it. */
function resolveVisualDatabaseUrl(rawUrl: string): string {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('VISUAL_DATABASE_URL is not a valid database URL.')
  }
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))
  if (!LOCAL_HOSTS.has(url.hostname) || !VISUAL_DATABASE_NAME.test(databaseName)) {
    throw new Error(
      `Refusing to run the visual harness: "${databaseName}" on host "${url.hostname}" is not a local database ending in "_web" ` +
        '(for example arthouz_next_test_web on localhost). The run migrates, seeds and writes settings.',
    )
  }
  return rawUrl
}

export const VISUAL_DATABASE_URL = resolveVisualDatabaseUrl(process.env.VISUAL_DATABASE_URL ?? DEFAULT_DATABASE_URL)
export const VISUAL_TODAY = process.env.TODAY_OVERRIDE ?? '2026-10-30'
export const SEED_ADMIN = { email: 'visual-admin@example.com', password: 'visual-admin-password' } as const

// Overridable so two visual runs can execute concurrently on one machine.
export const VISUAL_WEB_PORT = Number(process.env.VISUAL_WEB_PORT ?? 3100)
