/* eslint-disable @next/next/no-img-element -- Uploaded media are served from the bucket at stored sizes; next/image has nothing to optimise in the CMS. */
import { Link } from 'react-router'
import { OrderedList } from '../../components/ui'
import { SectionCard } from './SectionCard'
import { useFeaturedArtists, useReorderFeatured } from './useArtists'

export function FeaturedOrderCard() {
  const featured = useFeaturedArtists()
  const reorder = useReorderFeatured()
  const items = featured.data ?? []

  const onMove = (id: string, dir: 'up' | 'down') => {
    const index = items.findIndex((a) => a.id === id)
    const target = dir === 'up' ? index - 1 : index + 1
    if (index < 0 || target < 0 || target >= items.length) return
    const ids = items.map((a) => a.id)
    ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
    reorder.mutate(ids)
  }

  return (
    <SectionCard title="Featured on the Artists page" note={featured.data ? `${items.length} featured` : undefined}>
      {featured.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load the featured artists.</p>}
      {featured.data && items.length === 0 && <p className="m-0 text-13 text-muted">No artists are featured.</p>}
      {items.length > 0 && (
        <OrderedList
          label="Featured artists"
          items={items}
          onMove={onMove}
          renderItem={(artist) => (
            <span className="flex items-center gap-3">
              {artist.portraitImage ? (
                <img src={artist.portraitImage.thumbUrl} alt="" width={36} height={36} className="h-9 w-9 shrink-0 bg-img-ph object-cover" />
              ) : (
                <span className="h-9 w-9 shrink-0 bg-img-ph" aria-hidden="true" />
              )}
              <Link to={`/artists/${artist.id}`} className="truncate font-display text-18 hover:text-rust">{artist.name}</Link>
              <span className="hidden truncate text-12 text-muted xl:inline">{[artist.medium, artist.base].filter(Boolean).join(', ')}</span>
            </span>
          )}
        />
      )}
    </SectionCard>
  )
}
