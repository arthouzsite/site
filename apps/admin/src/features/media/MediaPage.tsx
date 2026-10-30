import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHead } from '../../components/PageHead'
import { Pager } from '../../components/ui'
import { MEDIA_PAGE_SIZE, useMediaList } from './useMedia'
import { MediaDetailPanel } from './MediaDetailPanel'
import { MediaGrid } from './MediaGrid'
import { MediaToolbar } from './MediaToolbar'
import { UploadQueue } from './UploadQueue'
import { useDebouncedValue } from './useDebouncedValue'

const SEARCH_DEBOUNCE_MS = 250

export default function MediaPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const missingAlt = params.get('missingAlt') === 'true'
  const [search, setSearch] = useState(q)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const debounced = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const list = useMediaList({ q, page, missingAlt })

  const update = (changes: Record<string, string | null>) =>
    setParams((cur) => {
      const next = new URLSearchParams(cur)
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    }, { replace: true })

  useEffect(() => {
    if (debounced !== q) update({ q: debounced || null, page: null })
    // Only the debounced input should drive the URL; `q` is compared, not tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const total = list.data?.total ?? 0

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Media" subtitle={list.data ? `${total} ${total === 1 ? 'file' : 'files'}` : undefined} />
      <MediaToolbar
        search={search}
        onSearch={setSearch}
        missingAlt={missingAlt}
        onMissingAlt={(on) => update({ missingAlt: on ? 'true' : null, page: null })}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-6 max-[1100px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-4">
          <UploadQueue onUploaded={(media) => setSelectedId(media.id)} />
          {list.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load the library. Try again.</p>}
          {list.data && list.data.items.length === 0 && (
            <p className="m-0 py-10 text-center text-13 text-muted">{q || missingAlt ? 'No files match.' : 'No files yet.'}</p>
          )}
          {list.data && list.data.items.length > 0 && (
            <MediaGrid items={list.data.items} selectedId={selectedId} onSelect={(m) => setSelectedId(m.id)} />
          )}
          {list.data && total > MEDIA_PAGE_SIZE && (
            <Pager page={page} limit={MEDIA_PAGE_SIZE} total={total} onPage={(p) => update({ page: p > 1 ? String(p) : null })} />
          )}
        </div>
        {selectedId && (
          <MediaDetailPanel id={selectedId} onClose={() => setSelectedId(null)} onSelect={setSelectedId} />
        )}
      </div>
    </div>
  )
}
