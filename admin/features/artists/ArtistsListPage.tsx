import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { PageHead } from '../../components/PageHead'
import { Icon, Pager } from '../../components/ui'
import { useDebouncedValue } from '../media/useDebouncedValue'
import { ArtistsTable } from './ArtistsTable'
import { ArtistsToolbar } from './ArtistsToolbar'
import { DeleteArtistFlow } from './DeleteArtistFlow'
import { FeaturedOrderCard } from './FeaturedOrderCard'
import { LetterStrip } from './LetterStrip'
import { ARTISTS_PAGE_SIZE, type AdminArtist } from './types'
import { useArtistList, useFeaturedArtists } from './useArtists'

const SEARCH_DEBOUNCE_MS = 250

export default function ArtistsListPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const letter = params.get('letter') ?? ''
  const featured = params.get('featured') ?? ''
  const published = params.get('published') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [search, setSearch] = useState(q)
  const [toDelete, setToDelete] = useState<AdminArtist | null>(null)
  const debounced = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const list = useArtistList({ q, letter, featured, published, page, limit: ARTISTS_PAGE_SIZE })
  const featuredCount = useFeaturedArtists().data?.length ?? 0

  const update = (changes: Record<string, string | null>) =>
    setParams((cur) => {
      const next = new URLSearchParams(cur)
      for (const [key, value] of Object.entries({ page: null, ...changes })) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    }, { replace: true })

  useEffect(() => {
    if (debounced !== q) update({ q: debounced || null })
    // Only the debounced input drives the URL; `q` is compared, not tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const total = list.data?.total ?? 0

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title="Artists"
        subtitle={list.data ? `${total} ${total === 1 ? 'artist' : 'artists'}` : undefined}
        actions={
          <Link to="/artists/new" className="inline-flex h-11 items-center gap-2.5 rounded-xs border border-ink bg-ink px-4 text-12 uppercase tracking-eyebrow text-paper transition-colors hover:border-amber hover:bg-amber hover:text-ink">
            <Icon name="plus" /> New artist
          </Link>
        }
      />
      <FeaturedOrderCard />
      <ArtistsToolbar
        search={search}
        onSearch={setSearch}
        featured={featured}
        onFeatured={(v) => update({ featured: v || null })}
        published={published}
        onPublished={(v) => update({ published: v || null })}
      />
      <LetterStrip value={letter} onChange={(l) => update({ letter: l || null })} />
      {list.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load artists. Try again.</p>}
      <ArtistsTable artists={list.data?.items ?? []} featuredCount={featuredCount} onDelete={setToDelete} />
      {list.data && <Pager page={page} limit={ARTISTS_PAGE_SIZE} total={total} onPage={(p) => update({ page: String(p) })} />}
      <DeleteArtistFlow artist={toDelete} onClose={() => setToDelete(null)} />
    </div>
  )
}
