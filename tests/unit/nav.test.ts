import { describe, expect, it } from 'vitest'
import { FOOTER_NAV, NAV_ITEMS, SERVICES_HREF, isActive } from '@/lib/nav'

describe('navigation items', () => {
  it('places Services between News and About in the header and footer', () => {
    for (const items of [NAV_ITEMS, FOOTER_NAV]) {
      const labels = items.map((item) => item.label)
      expect(labels.indexOf('Services')).toBe(labels.indexOf('News') + 1)
      expect(labels.indexOf('About')).toBe(labels.indexOf('Services') + 1)
    }
    expect(NAV_ITEMS.find((item) => item.label === 'Services')?.href).toBe(SERVICES_HREF)
    expect(FOOTER_NAV.find((item) => item.label === 'Services')?.href).toBe('/services')
  })

  it('marks Services active on the index and on any service page, but not on a lookalike path', () => {
    expect(isActive('/services', SERVICES_HREF)).toBe(true)
    expect(isActive('/services/art-sales', SERVICES_HREF)).toBe(true)
    expect(isActive('/services-archive', SERVICES_HREF)).toBe(false)
    expect(isActive('/about', SERVICES_HREF)).toBe(false)
  })
})
