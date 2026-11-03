import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BackLink } from '@/components/site/BackLink'
import { PageTitle } from '@/components/site/PageTitle'

describe('PageTitle (FIN-3512)', () => {
  it('renders the page H1 in the display face at the index scale by default', () => {
    const html = renderToStaticMarkup(<PageTitle className="mb-10">Exhibitions</PageTitle>)
    expect(html).toMatch(/^<h1 class="[^"]*font-display[^"]*">Exhibitions<\/h1>$/)
    expect(html).toContain('text-[clamp(56px,9vw,148px)]')
    expect(html).toContain('mb-10')
  })

  it('uses the shared detail scale for record pages', () => {
    const html = renderToStaticMarkup(<PageTitle variant="detail" id="t">The Weight of Light</PageTitle>)
    expect(html).toContain('id="t"')
    expect(html).toContain('text-[clamp(44px,7vw,112px)]')
    expect(html).toContain('text-balance')
  })
})

describe('BackLink (FIN-3484)', () => {
  it('is an accent-coloured link back to the section with a decorative arrow', () => {
    const html = renderToStaticMarkup(<BackLink href="/exhibitions">Exhibitions</BackLink>)
    expect(html).toContain('href="/exhibitions"')
    expect(html).toContain('text-rust')
    expect(html).not.toContain('text-muted')
    expect(html).toContain('<span aria-hidden="true">←</span>Exhibitions')
  })
})
