import { describe, expect, it } from 'vitest'
import { toAdminArtwork, type ArtworkRow } from './artworks.mapper'

describe('toAdminArtwork', () => {
  it('keeps the row and exposes only the public image fields', () => {
    const image = { id: 'm1', url: 'u', thumbUrl: 't', width: 1, height: 2, alt: 'a', key: 'secret', kind: 'IMAGE' }
    const dto = toAdminArtwork({ id: 'w1', title: 'One', image } as unknown as ArtworkRow)
    expect(dto).toEqual({ id: 'w1', title: 'One', image: { id: 'm1', url: 'u', thumbUrl: 't', width: 1, height: 2, alt: 'a' } })
  })

  it('maps a missing image to null', () => {
    expect(toAdminArtwork({ id: 'w1', image: null } as unknown as ArtworkRow).image).toBeNull()
  })
})
