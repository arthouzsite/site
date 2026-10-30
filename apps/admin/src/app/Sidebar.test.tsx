import { describe, expect, it } from 'vitest'
import { publicSiteUrl } from './Sidebar'

describe('publicSiteUrl', () => {
  it('prefers the dedicated public-site variable', () => {
    expect(publicSiteUrl({ VITE_PUBLIC_SITE_URL: 'https://arthouz.example', VITE_WEB_URL: 'https://web.example' })).toBe('https://arthouz.example')
  })

  it('falls back to the web URL used for view-on-site links', () => {
    expect(publicSiteUrl({ VITE_WEB_URL: 'https://web.example' })).toBe('https://web.example')
    expect(publicSiteUrl({ VITE_PUBLIC_SITE_URL: '', VITE_WEB_URL: 'https://web.example' })).toBe('https://web.example')
  })

  it('uses / only when neither is set', () => {
    expect(publicSiteUrl({})).toBe('/')
  })
})
