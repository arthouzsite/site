import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

const VALID_BASE = {
  DATABASE_URL: 'postgresql://localhost/db',
  JWT_SECRET: 'x'.repeat(32),
  SEED_ADMIN_EMAIL: 'admin@example.test',
  SEED_ADMIN_PASSWORD: 'password',
}

const STORAGE_VARS = {
  S3_ENDPOINT: 'https://a.r2.cloudflarestorage.com',
  AWS_ACCESS_KEY_ID: 'b',
  AWS_SECRET_ACCESS_KEY: 'c',
  AWS_S3_BUCKET_NAME: 'd',
}

const build = (extra: Record<string, string>): Record<string, string> => ({ ...VALID_BASE, ...extra })

describe('parseEnv', () => {
  it('no longer requires or exposes the retired variables', () => {
    const env = parseEnv(build({ NODE_ENV: 'test', PORT: '1', ADMIN_ORIGIN: 'x', WEB_URL: 'y', REVALIDATE_SECRET: 'z' }))
    for (const key of ['PORT', 'ADMIN_ORIGIN', 'WEB_URL', 'REVALIDATE_SECRET']) expect(env).not.toHaveProperty(key)
  })

  it('treats NEXT_PUBLIC_SITE_URL as an optional URL', () => {
    expect(parseEnv(build({ NODE_ENV: 'test' })).NEXT_PUBLIC_SITE_URL).toBeUndefined()
    expect(parseEnv(build({ NODE_ENV: 'test', NEXT_PUBLIC_SITE_URL: 'https://arthouz.example' })).NEXT_PUBLIC_SITE_URL).toBe('https://arthouz.example')
    expect(() => parseEnv(build({ NODE_ENV: 'test', NEXT_PUBLIC_SITE_URL: 'not a url' }))).toThrow(/NEXT_PUBLIC_SITE_URL/)
  })

  it('defaults STORAGE_DRIVER to memory when NODE_ENV is test', () => {
    expect(parseEnv(build({ NODE_ENV: 'test' })).STORAGE_DRIVER).toBe('memory')
  })

  it('defaults STORAGE_DRIVER to r2 outside test and then requires the R2 vars', () => {
    expect(() => parseEnv(build({ NODE_ENV: 'production' }))).toThrow(/AWS_S3_BUCKET_NAME is required/)
    expect(parseEnv(build({ NODE_ENV: 'production', ...STORAGE_VARS })).STORAGE_DRIVER).toBe('r2')
  })

  it('needs no public bucket url: media is served through the app', () => {
    const env = parseEnv(build({ NODE_ENV: 'production', ...STORAGE_VARS, RETIRED_BUCKET_URL: 'https://old.example.test' }))
    expect(env.STORAGE_DRIVER).toBe('r2')
  })

  it('defaults MEDIA_URL_TTL_SECONDS to seven days and bounds it to 3600..604800', () => {
    expect(parseEnv(build({ NODE_ENV: 'test' })).MEDIA_URL_TTL_SECONDS).toBe(604800)
    expect(parseEnv(build({ NODE_ENV: 'test', MEDIA_URL_TTL_SECONDS: '' })).MEDIA_URL_TTL_SECONDS).toBe(604800)
    expect(parseEnv(build({ NODE_ENV: 'test', MEDIA_URL_TTL_SECONDS: '3600' })).MEDIA_URL_TTL_SECONDS).toBe(3600)
    for (const bad of ['59', '3599', '604801', '1.5', 'soon']) {
      expect(() => parseEnv(build({ NODE_ENV: 'test', MEDIA_URL_TTL_SECONDS: bad }))).toThrow(/MEDIA_URL_TTL_SECONDS/)
    }
  })

  it('defaults MEDIA_URL_BASE to /media, trims trailing slashes and accepts an absolute origin', () => {
    expect(parseEnv(build({ NODE_ENV: 'test' })).MEDIA_URL_BASE).toBe('/media')
    expect(parseEnv(build({ NODE_ENV: 'test', MEDIA_URL_BASE: '' })).MEDIA_URL_BASE).toBe('/media')
    expect(parseEnv(build({ NODE_ENV: 'test', MEDIA_URL_BASE: '/assets/' })).MEDIA_URL_BASE).toBe('/assets')
    expect(parseEnv(build({ NODE_ENV: 'test', MEDIA_URL_BASE: 'https://cdn.example.test//' })).MEDIA_URL_BASE).toBe('https://cdn.example.test')
  })

  it('rejects a MEDIA_URL_BASE that is neither a path nor an http(s) URL', () => {
    expect(() => parseEnv(build({ NODE_ENV: 'test', MEDIA_URL_BASE: 'media' }))).toThrow(/MEDIA_URL_BASE/)
    expect(() => parseEnv(build({ NODE_ENV: 'test', MEDIA_URL_BASE: 'ftp://x' }))).toThrow(/MEDIA_URL_BASE/)
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

  it('accepts ALLOW_TEST_OVERRIDES as an optional string', () => {
    expect(parseEnv(build({ NODE_ENV: 'test' })).ALLOW_TEST_OVERRIDES).toBeUndefined()
    expect(parseEnv(build({ NODE_ENV: 'test', ALLOW_TEST_OVERRIDES: '1' })).ALLOW_TEST_OVERRIDES).toBe('1')
  })

  it('reports every missing required variable', () => {
    expect(() => parseEnv({ NODE_ENV: 'test' })).toThrow(/DATABASE_URL[\s\S]*SEED_ADMIN_EMAIL/)
  })
})
