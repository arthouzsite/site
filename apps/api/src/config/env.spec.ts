import { parseEnv } from './env'

const VALID_BASE = {
  DATABASE_URL: 'postgresql://localhost/db',
  JWT_SECRET: 'x'.repeat(32),
  REVALIDATE_SECRET: 'secret',
  SEED_ADMIN_EMAIL: 'admin@example.test',
  SEED_ADMIN_PASSWORD: 'password',
}

const R2_VARS = {
  R2_ACCOUNT_ID: 'a',
  R2_ACCESS_KEY_ID: 'b',
  R2_SECRET_ACCESS_KEY: 'c',
  R2_BUCKET: 'd',
  R2_PUBLIC_URL: 'https://cdn.example.test',
}

const build = (extra: Record<string, string>): NodeJS.ProcessEnv => ({ ...VALID_BASE, ...extra })

describe('parseEnv', () => {
  it('applies defaults for port and origins', () => {
    const env = parseEnv(build({ NODE_ENV: 'test' }))
    expect(env.PORT).toBe(4100)
    expect(env.ADMIN_ORIGIN).toBe('http://localhost:5180')
    expect(env.WEB_URL).toBe('http://localhost:3100')
  })

  it('defaults STORAGE_DRIVER to memory when NODE_ENV is test', () => {
    expect(parseEnv(build({ NODE_ENV: 'test' })).STORAGE_DRIVER).toBe('memory')
  })

  it('defaults STORAGE_DRIVER to r2 outside test and then requires the R2 vars', () => {
    expect(() => parseEnv(build({ NODE_ENV: 'production' }))).toThrow(/R2_BUCKET is required/)
    expect(parseEnv(build({ NODE_ENV: 'production', ...R2_VARS })).STORAGE_DRIVER).toBe('r2')
  })

  it('does not require R2 vars when STORAGE_DRIVER is memory', () => {
    expect(parseEnv(build({ NODE_ENV: 'production', STORAGE_DRIVER: 'memory' })).STORAGE_DRIVER).toBe('memory')
  })

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    expect(() => parseEnv(build({ NODE_ENV: 'test', JWT_SECRET: 'short' }))).toThrow(/JWT_SECRET/)
  })

  it('rejects a malformed TODAY_OVERRIDE and accepts YYYY-MM-DD', () => {
    expect(() => parseEnv(build({ NODE_ENV: 'test', TODAY_OVERRIDE: '30/10/2026' }))).toThrow(/TODAY_OVERRIDE/)
    expect(parseEnv(build({ NODE_ENV: 'test', TODAY_OVERRIDE: '2026-10-30' })).TODAY_OVERRIDE).toBe('2026-10-30')
  })

  it('reports every missing required variable', () => {
    expect(() => parseEnv({ NODE_ENV: 'test' })).toThrow(/DATABASE_URL[\s\S]*SEED_ADMIN_EMAIL/)
  })
})
