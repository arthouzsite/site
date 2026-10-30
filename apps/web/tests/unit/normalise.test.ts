import { describe, expect, it } from 'vitest'
import { fixImageSlotFrameSize, hidePublicationsLink, reorderArtists, reorderNews } from '@/tests/visual/normalise'

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
})
