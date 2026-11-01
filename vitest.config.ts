import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const COVERAGE_THRESHOLD_PERCENT = 80
const SERVER_TEST_TIMEOUT_MS = 30_000
const REPO_ROOT = fileURLToPath(new URL('.', import.meta.url))
// `server-only` throws outside Next's react-server condition; unit and API specs import server modules directly.
const ALIAS = { '@': REPO_ROOT, 'server-only': fileURLToPath(new URL('./tests/support/server-only-stub.ts', import.meta.url)) }

const SITE_TEST_ENV = {
  STORAGE_DRIVER: 'memory',
  DATABASE_URL: 'postgresql://localhost/unused',
  JWT_SECRET: 'site-test-jwt-secret-site-test-jwt-secret',
  SEED_ADMIN_EMAIL: 'admin@example.test',
  SEED_ADMIN_PASSWORD: 'unused',
}

const SITE_COVERAGE = ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}', 'lib/*.{ts,tsx}']
const ADMIN_COVERAGE = ['admin/**/*.{ts,tsx}']
const SERVER_COVERAGE = ['lib/server/**/*.ts', 'app/api/**/*.ts']
// Legacy routes still exercised by the site unit tests; they leave this list as they move onto the server project.
const SITE_OWNED_ROUTES = ['app/api/search/**']

/** Names passed with `--project` / `--project=`; empty when the run covers every project. */
function requestedProjects(argv: readonly string[]): string[] {
  return argv.flatMap((arg, index) => {
    if (arg.startsWith('--project=')) return [arg.slice('--project='.length)]
    return arg === '--project' && argv[index + 1] ? [argv[index + 1]!] : []
  })
}

// Vitest has a single coverage config for the whole run, so a single-project run narrows it to that project's files.
const requested = requestedProjects(process.argv)
const isRunning = (name: string): boolean => requested.length === 0 || requested.includes(name)
const isServerOnly = requested.length > 0 && requested.every((name) => name === 'server')

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: [
        ...(isRunning('site') ? SITE_COVERAGE : []),
        ...(isRunning('server') ? SERVER_COVERAGE : []),
        ...(isRunning('admin') ? ADMIN_COVERAGE : []),
      ],
      exclude: [
        'lib/shared/**',
        'lib/server/generated/**',
        'admin/test/**',
        'admin/AdminApp.tsx',
        'tests/**',
        '**/*.test.{ts,tsx}',
        '**/*.d.ts',
        ...(isServerOnly ? SITE_OWNED_ROUTES : []),
      ],
      thresholds: {
        lines: COVERAGE_THRESHOLD_PERCENT,
        functions: COVERAGE_THRESHOLD_PERCENT,
        branches: COVERAGE_THRESHOLD_PERCENT,
        statements: COVERAGE_THRESHOLD_PERCENT,
      },
    },
    projects: [
      {
        resolve: { alias: ALIAS },
        test: {
          name: 'site',
          environment: 'node',
          // `lib/api.ts` presents media URLs through the storage driver, which parses the server environment on import.
          env: SITE_TEST_ENV,
          include: ['tests/unit/**/*.test.{ts,tsx}'],
        },
      },
      {
        resolve: { alias: ALIAS },
        // The CMS is a React Router client app: its page URL is the origin MSW handlers are written against.
        test: {
          name: 'admin',
          environment: 'jsdom',
          environmentOptions: { jsdom: { url: 'http://localhost/' } },
          include: ['admin/**/*.test.{ts,tsx}'],
          setupFiles: ['./admin/test/setup.ts'],
          globals: true,
          css: false,
        },
      },
      {
        resolve: { alias: ALIAS },
        test: {
          name: 'server',
          environment: 'node',
          include: ['lib/server/**/*.test.ts', 'lib/shared/**/*.test.ts', 'tests/api/**/*.spec.ts'],
          setupFiles: ['./vitest.setup.server.ts'],
          fileParallelism: false,
          testTimeout: SERVER_TEST_TIMEOUT_MS,
        },
      },
    ],
  },
})
