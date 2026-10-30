import { existsSync } from 'node:fs'
import path from 'node:path'
import { WEB_ROOT } from './paths'

const WEB_ENV_FILE = path.join(WEB_ROOT, '.env')
if (existsSync(WEB_ENV_FILE)) process.loadEnvFile(WEB_ENV_FILE)

export const VISUAL_DATABASE_URL = process.env.VISUAL_DATABASE_URL ?? 'postgresql://manoranjith@localhost:5433/arthouz_test_t11'
export const VISUAL_TODAY = '2026-10-30'
export const VISUAL_REVALIDATE_SECRET = process.env.REVALIDATE_SECRET ?? 'visual-test-revalidate-secret'
export const API_DIR = path.join(WEB_ROOT, '..', 'api')
export const SEED_ADMIN = { email: 'visual-admin@example.com', password: 'visual-admin-password' } as const
