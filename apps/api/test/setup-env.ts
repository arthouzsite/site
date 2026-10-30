import 'dotenv/config'

const TEST_DATABASE_URL = process.env.DATABASE_URL_TEST ?? 'postgresql://localhost/arthouz_test'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = TEST_DATABASE_URL
process.env.DATABASE_URL_TEST = TEST_DATABASE_URL
process.env.STORAGE_DRIVER = 'memory'
process.env.JWT_SECRET ??= 'test-jwt-secret-test-jwt-secret-test'
process.env.REVALIDATE_SECRET ??= 'test-revalidate-secret'
process.env.SEED_ADMIN_EMAIL ??= 'admin@example.test'
process.env.SEED_ADMIN_PASSWORD ??= 'test-password-123'
