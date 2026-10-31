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
export const VISUAL_DATABASE_URL = process.env.VISUAL_DATABASE_URL ?? DEFAULT_DATABASE_URL
export const VISUAL_TODAY = process.env.TODAY_OVERRIDE ?? '2026-10-30'
export const SEED_ADMIN = { email: 'visual-admin@example.com', password: 'visual-admin-password' } as const

// Overridable so two visual runs can execute concurrently on one machine.
export const VISUAL_WEB_PORT = Number(process.env.VISUAL_WEB_PORT ?? 3100)
