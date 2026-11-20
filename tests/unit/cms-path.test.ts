import { describe, expect, it } from 'vitest'
import { cmsPath, DEFAULT_CMS_PATH } from '@/lib/cms-path'
import { cmsRewrites } from '@/next.config'

describe('cmsPath', () => {
  it('defaults to a long segment of letters and digits that is not "admin"', () => {
    expect(cmsPath(undefined)).toBe(DEFAULT_CMS_PATH)
    expect(cmsPath('  ')).toBe(DEFAULT_CMS_PATH)
    expect(DEFAULT_CMS_PATH).toMatch(/^[a-z0-9]{40}$/)
    expect(DEFAULT_CMS_PATH).toMatch(/[a-z]/)
    expect(DEFAULT_CMS_PATH).toMatch(/[0-9]/)
  })

  it('takes a configured segment and refuses one that could break routing', () => {
    expect(cmsPath(' staff-desk-42 ')).toBe('staff-desk-42')
    expect(() => cmsPath('a/b')).toThrow('NEXT_PUBLIC_CMS_PATH')
    expect(() => cmsPath('../x')).toThrow('NEXT_PUBLIC_CMS_PATH')
  })
})

describe('cmsRewrites', () => {
  it('serves the CMS at the public path and hides /admin, in that order of precedence', () => {
    expect(cmsRewrites('k3y')).toEqual([
      { source: '/admin/:path*', destination: '/cms-not-here' },
      { source: '/k3y/:path*', destination: '/admin/:path*' },
    ])
  })

  it('adds nothing when the CMS is configured to stay at /admin', () => {
    expect(cmsRewrites('admin')).toEqual([])
  })
})
