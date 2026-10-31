import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { addServicesMenuSubs, addServicesNav, fixImageSlotFrameSize, hidePublicationsLink, reorderArtists, reorderNews } from '@/tests/visual/normalise'
import { REFERENCE_FILE } from '@/tests/visual/paths'

const PROTOTYPE = readFileSync(REFERENCE_FILE, 'utf8')
const SERVICE_TITLES = ['Art sales', 'Gallery on rent', 'Art for rent', 'Corporate painting execution', 'Turn-key art projects']

const SOURCE = `const AH_NEWS = [
  { id: 'n1', title: 'First' },
  { id: 'n2', title: "Second's" }
];
const AH_ARTISTS = ['B. One','A. Two','C. Three'];`

describe('normalise patches', () => {
  it('rewrites AH_ARTISTS to the API order when the name sets match', () => {
    const result = reorderArtists(SOURCE, ['A. Two', 'B. One', 'C. Three'])

    expect(result).toContain('const AH_ARTISTS = ["A. Two","B. One","C. Three"];')
  })

  it('throws listing missing and extra artist names', () => {
    expect(() => reorderArtists(SOURCE, ['A. Two', 'B. One', 'D. Four'])).toThrow(
      /missing from API: \["C\. Three"\][\s\S]*extra in API: \["D\. Four"\]/,
    )
  })

  it('reorders AH_NEWS by API title and rejects unknown titles', () => {
    expect(reorderNews(SOURCE, ["Second's", 'First'])).toMatch(/id: 'n2'[\s\S]*id: 'n1'/)
    expect(() => reorderNews(SOURCE, ['First', 'Unknown'])).toThrow(/not found in AH_NEWS: Unknown/)
  })

  it('guards the publications "View more" link behind hasPubUrl and adds the false default', () => {
    const source = `<a href="#" style="color:red" onClick="{{ go }}">View more ↗</a>\n tabPublications: s.tab === 'publications',`

    const result = hidePublicationsLink(source)

    expect(result).toContain('<sc-if value="{{ hasPubUrl }}" hint-placeholder-val="{{ false }}"><a href="#"')
    expect(result).toContain("tabPublications: s.tab === 'publications', hasPubUrl: false,")
  })

  it('throws when the View more anchor is not found exactly once', () => {
    expect(() => hidePublicationsLink(`tabPublications: s.tab === 'publications',`)).toThrow(/View more anchor/)
  })

  it('makes image-slot read fractional frame sizes from getBoundingClientRect', () => {
    const script = 'const fw = this.clientWidth, fh = this.clientHeight;\nif (!fw) return null;'

    const result = fixImageSlotFrameSize(script)

    expect(result).toContain('const { width: fw, height: fh } = this.getBoundingClientRect();')
    expect(result).not.toContain('clientHeight')
  })

  it('throws when the image-slot frame read is not found exactly once', () => {
    expect(() => fixImageSlotFrameSize('nothing here')).toThrow(/image-slot frame size/)
  })

  it('throws when the hasPubUrl default has no tabPublications anchor to follow', () => {
    expect(() => hidePublicationsLink('<a href="#" style="x">View more ↗</a>')).toThrow(/renderVals hasPubUrl/)
  })
})

describe('services navigation patches', () => {
  it('(h) inserts Services after News in navDefs and in footerNav', () => {
    const source = "const navDefs = [['News', 'news', ['news']], ['About', 'about', ['about']]];\nfooterNav: [['News', 'news'], ['About', 'about']]"

    const result = addServicesNav(source)

    expect(result).toContain("['News', 'news', ['news']], ['Services', 'services', ['services']], ['About'")
    expect(result).toContain("['News', 'news'], ['Services', 'services'], ['About', 'about']]")
  })

  it('(h) throws when an anchor is missing', () => {
    expect(() => addServicesNav("footerNav: [['News', 'news']]")).toThrow(/navDefs Services/)
    expect(() => addServicesNav("[['News', 'news', ['news']], ]")).toThrow(/footerNav Services/)
  })

  it('(i) gives the Services item its titles and renders them as an indented list after the menu link', () => {
    const source = [
      "return { label, go: this.h(() => this.go(page)), color: on ? '#B4651A' : '#161513', line: on ? '#B4651A' : 'transparent' };",
      `<a href="#" onClick="{{ n.go }}" style="font-family:'EB Garamond',serif;font-size:44px;line-height:1;padding:16px 0;color:#EDEAE4">{{ n.label }}</a>`,
    ].join('\n')

    const result = addServicesMenuSubs(source, ["Art's sales", 'Art for rent'])

    expect(result).toContain(`line: on ? '#B4651A' : 'transparent', subs: label === 'Services' ? ["Art's sales","Art for rent"].map(`)
    expect(result).toMatch(/<\/a><sc-if value="\{\{ n\.subs \}\}"[^>]*><div style="padding-left:24px"><sc-for list="\{\{ n\.subs \}\}"/)
    expect(result).toContain('font-size:28px;line-height:1;padding:12px 0;border-bottom:1px solid rgba(237,234,228,0.16);color:#C9C4BB')
  })

  it('(i) throws when the nav item or the menu link is not found exactly once', () => {
    expect(() => addServicesMenuSubs('nothing', SERVICE_TITLES)).toThrow(/nav subs value/)
    expect(() => addServicesMenuSubs("line: on ? '#B4651A' : 'transparent' };", SERVICE_TITLES)).toThrow(/menu service sub-list/)
  })

  it('both patches apply to the checked-in prototype, in either order, and add exactly the port nav', () => {
    const viaH = addServicesNav(addServicesMenuSubs(PROTOTYPE, SERVICE_TITLES))
    const viaI = addServicesMenuSubs(addServicesNav(PROTOTYPE), SERVICE_TITLES)

    expect(viaH).toBe(viaI)
    expect(viaH.match(/\['Services', 'services'/g)).toHaveLength(2)
    expect(viaH).toContain(JSON.stringify(SERVICE_TITLES))
    expect(viaH.match(/\{\{ n\.subs \}\}/g)).toHaveLength(2)
  })
})

