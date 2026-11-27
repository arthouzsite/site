import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PageIntro } from '@/components/site/PageIntro'
import {
  DESCRIBED_PAGES, EMPTY_PAGE_DESCRIPTIONS, PAGE_DESCRIPTION_MAX, publicSettingsSchema, settingSchemas,
} from '@/lib/shared'

describe('page descriptions (FIN-3781)', () => {
  it('shows the description under the title, and only the title when there is none', () => {
    const withText = renderToStaticMarkup(<PageIntro title="Prints" description="Limited editions." className="mb-14" />)
    expect(withText).toMatch(/^<header class="mb-14"><h1[^>]*>Prints<\/h1><p[^>]*>Limited editions\.<\/p><\/header>$/)
    expect(renderToStaticMarkup(<PageIntro title="Prints" description="" />)).not.toContain('<p')
  })

  it('covers every section page and fills pages missing from a stored value', () => {
    expect(DESCRIBED_PAGES.map(({ page }) => page)).toEqual(['exhibitions', 'artists', 'fairs', 'news', 'services', 'prints', 'about', 'visit'])
    expect(settingSchemas.pageDescriptions.parse({ artists: '  Painters and sculptors.  ' })).toEqual({ ...EMPTY_PAGE_DESCRIPTIONS, artists: 'Painters and sculptors.' })
  })

  it('refuses a description over the limit', () => {
    expect(settingSchemas.pageDescriptions.safeParse({ news: 'x'.repeat(PAGE_DESCRIPTION_MAX + 1) }).success).toBe(false)
  })

  it('reads public settings cached before the descriptions existed', () => {
    const cached = {
      heroLayout: 'SPLIT', artistIndexLayout: 'GROUPED',
      footer: { tagline: '', instagramUrl: '', facebookUrl: '', copyrightFrom: 2012 },
      site: { title: '', description: '', ogImage: null },
    }
    expect(publicSettingsSchema.parse(cached).pageDescriptions).toEqual(EMPTY_PAGE_DESCRIPTIONS)
  })
})
