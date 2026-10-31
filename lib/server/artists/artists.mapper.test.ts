import { describe, expect, it } from 'vitest'
import { toAdminArtist, type ArtistRow } from './artists.mapper'

const MEDIA = { id: 'm1', key: 'k', url: 'u', thumbUrl: 't', width: 1, height: 2, mime: 'image/jpeg', bytes: 3, alt: 'a', kind: 'IMAGE' }

function row(over: Record<string, unknown> = {}): ArtistRow {
  return { id: 'a1', name: 'Kavya', sortName: 'Rao, Kavya', slug: 'kavya', portraitImage: null, _count: { artworks: 3 }, ...over } as unknown as ArtistRow
}

describe('toAdminArtist', () => {
  it('adds artworkCount and indexLetter, drops _count, nulls a missing portrait', () => {
    const dto = toAdminArtist(row())
    expect(dto).toMatchObject({ id: 'a1', artworkCount: 3, indexLetter: 'R', portraitImage: null })
    expect(dto).not.toHaveProperty('_count')
  })

  it('maps the portrait to the public image shape', () => {
    expect(toAdminArtist(row({ portraitImage: MEDIA })).portraitImage).toEqual({ id: 'm1', url: 'u', thumbUrl: 't', width: 1, height: 2, alt: 'a' })
  })
})
