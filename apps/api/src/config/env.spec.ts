import { parseEnv } from './env'

const VALID_BASE = {
  DATABASE_URL: 'postgresql://localhost/db',
  JWT_SECRET: 'x'.repeat(32),
  REVALIDATE_SECRET: 'secret',
  SEED_ADMIN_EMAIL: 'admin@example.test',
  SEED_ADMIN_PASSWORD: 'password',
}

const STORAGE_VARS = {
  S3_ENDPOINT: 'https://a.r2.cloudflarestorage.com',
  AWS_ACCESS_KEY_ID: 'b',
  AWS_SECRET_ACCESS_KEY: 'c',
  AWS_S3_BUCKET_NAME: 'd',
  AWS_S3_PUBLIC_URL: 'https://cdn.example.test',
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
    expect(() => parseEnv(build({ NODE_ENV: 'production' }))).toThrow(/AWS_S3_BUCKET_NAME is required/)
    expect(parseEnv(build({ NODE_ENV: 'production', ...STORAGE_VARS })).STORAGE_DRIVER).toBe('r2')
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

  it('defaults TRUST_PROXY to 0 and parses a non-negative hop count', () => {
    expect(parseEnv(build({ NODE_ENV: 'test' })).TRUST_PROXY).toBe(0)
    expect(parseEnv(build({ NODE_ENV: 'test', TRUST_PROXY: '1' })).TRUST_PROXY).toBe(1)
    expect(parseEnv(build({ NODE_ENV: 'test', TRUST_PROXY: '2' })).TRUST_PROXY).toBe(2)
  })

  it('rejects a negative, fractional or non-numeric TRUST_PROXY', () => {
    for (const bad of ['-1', '1.5', 'true', 'loopback']) {
      expect(() => parseEnv(build({ NODE_ENV: 'test', TRUST_PROXY: bad }))).toThrow(/TRUST_PROXY/)
    }
  })

  it('reports every missing required variable', () => {
    expect(() => parseEnv({ NODE_ENV: 'test' })).toThrow(/DATABASE_URL[\s\S]*SEED_ADMIN_EMAIL/)
  })
})
