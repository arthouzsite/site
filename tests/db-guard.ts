import { userInfo } from 'node:os'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
// `_test` for the main checkout, `_test_t<N>` for the per-task worktree databases.
const API_TEST_DATABASE_NAME = /_test(_t\d+)?$/

/** Prisma's CLI does not fall back to the OS user like libpq does, so the default names it explicitly. */
export const DEFAULT_API_TEST_DATABASE_URL = `postgresql://${encodeURIComponent(userInfo().username)}@localhost:5433/arthouz_next_test`

/**
 * The runs migrate and truncate every table, so refuse anything that is not a local database named for tests.
 * Returns the URL unchanged so callers can write `const url = assertLocalDatabase(...)`.
 */
export function assertLocalDatabase(rawUrl: string, namePattern: RegExp, label: string): string {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error(`${label} is not a valid database URL.`)
  }
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))
  if (!LOCAL_HOSTS.has(url.hostname) || !namePattern.test(databaseName)) {
    throw new Error(
      `Refusing to run: "${databaseName}" on host "${url.hostname}" (${label}) is not a local database matching ${namePattern}. ` +
        'The run migrates and truncates every table; point it at a throwaway local database such as arthouz_next_test.',
    )
  }
  return rawUrl
}

export function resolveApiTestDatabaseUrl(rawUrl: string | undefined = process.env.DATABASE_URL_TEST): string {
  return assertLocalDatabase(rawUrl ?? DEFAULT_API_TEST_DATABASE_URL, API_TEST_DATABASE_NAME, 'DATABASE_URL_TEST')
}
