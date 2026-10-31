import 'dotenv/config'

// Next's typings make NODE_ENV read-only; the harness has to set it before any module reads the environment.
const env = process.env as Record<string, string | undefined>

const TEST_DATABASE_URL = env.DATABASE_URL_TEST ?? 'postgresql://manoranjith@localhost:5433/arthouz_next_test'

env.NODE_ENV = 'test'
env.DATABASE_URL = TEST_DATABASE_URL
env.DIRECT_DATABASE_URL = TEST_DATABASE_URL
env.DATABASE_URL_TEST = TEST_DATABASE_URL
env.STORAGE_DRIVER = 'memory'
env.JWT_SECRET ??= 'test-jwt-secret-test-jwt-secret-test'
env.SEED_ADMIN_EMAIL ??= 'admin@example.test'
env.SEED_ADMIN_PASSWORD ??= 'test-password-123'
// Tests use the built-in clock unless a spec sets it; a developer's .env must not leak in.
delete env.TODAY_OVERRIDE
delete env.TRUST_PROXY
delete env.NEXT_PUBLIC_SITE_URL
