import { userInfo } from 'node:os'
import { describe, expect, it } from 'vitest'
import { DEFAULT_API_TEST_DATABASE_URL, assertLocalDatabase, resolveApiTestDatabaseUrl } from '@/tests/db-guard'

const url = (host: string, db: string) => `postgresql://user@${host}:5433/${db}`

describe('resolveApiTestDatabaseUrl', () => {
  it('accepts local hosts with _test and per-task _test_t<N> names', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      expect(resolveApiTestDatabaseUrl(url(host, 'arthouz_next_test'))).toBe(url(host, 'arthouz_next_test'))
    }
    expect(resolveApiTestDatabaseUrl(url('localhost', 'arthouz_next_test_t12'))).toContain('arthouz_next_test_t12')
  })

  it('refuses a remote host even with a test-looking name', () => {
    expect(() => resolveApiTestDatabaseUrl(url('ep-cool-123.neon.tech', 'arthouz_test'))).toThrow(/Refusing/)
  })

  it('refuses a local database that is not named for tests', () => {
    for (const db of ['arthouz', 'arthouz_next', 'arthouz_test_web', 'arthouz_test_e2e', 'arthouz_test_tx', 'test_data']) {
      expect(() => resolveApiTestDatabaseUrl(url('localhost', db))).toThrow(/Refusing/)
    }
  })

  it('refuses an unparseable URL', () => {
    expect(() => resolveApiTestDatabaseUrl('not a url')).toThrow(/not a valid database URL/)
  })

  it('defaults to the OS user on the local test database', () => {
    expect(DEFAULT_API_TEST_DATABASE_URL).toBe(`postgresql://${encodeURIComponent(userInfo().username)}@localhost:5433/arthouz_next_test`)
    expect(resolveApiTestDatabaseUrl(undefined)).toBe(process.env.DATABASE_URL_TEST ?? DEFAULT_API_TEST_DATABASE_URL)
  })
})

describe('assertLocalDatabase', () => {
  it('applies the caller-provided name pattern', () => {
    expect(assertLocalDatabase(url('localhost', 'x_web'), /_web$/, 'VISUAL')).toBe(url('localhost', 'x_web'))
    expect(() => assertLocalDatabase(url('localhost', 'x_e2e'), /_web$/, 'VISUAL')).toThrow(/VISUAL/)
  })
})
