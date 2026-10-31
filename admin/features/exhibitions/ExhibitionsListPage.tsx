import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { PageHead } from '../../components/PageHead'
import { DataTable, Icon, Pager } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useDebouncedValue } from '../media/useDebouncedValue'
import { BulkBar } from './BulkBar'
import { ExhibitionFilters } from './ExhibitionFilters'
import { exhibitionColumns } from './exhibitionColumns'
import type { AdminExhibition } from './types'
import { EXHIBITIONS_PAGE_SIZE, useBulkPublish, useExhibitionCities, useExhibitionList, usePublishExhibition } from './useExhibitions'

const SEARCH_DEBOUNCE_MS = 250
const getRowId = (e: AdminExhibition) => e.id
const getRowLabel = (e: AdminExhibition) => e.title
const plural = (n: number) => `${n} ${n === 1 ? 'exhibition' : 'exhibitions'}`

export default function ExhibitionsListPage() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const city = params.get('city') ?? ''
  const published = params.get('published') ?? ''
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [search, setSearch] = useState(q)
  const [selection, setSelection] = useState<RowSelectionState>({})
  const debounced = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const list = useExhibitionList({ status, city, published, q, page })
  const cities = useExhibitionCities()
  const bulk = useBulkPublish()
  const publishOne = usePublishExhibition()
  const toast = useToast()

  // Every URL change is a new filter, search or page, so ids selected on the previous view no longer apply.
  const update = (changes: Record<string, string | null>) => {
    setSelection({})
    setParams((cur) => {
      const next = new URLSearchParams(cur)
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    }, { replace: true })
  }
  const filter = (key: string) => (value: string) => update({ [key]: value || null, page: null })

  useEffect(() => {
    if (debounced !== q) update({ q: debounced || null, page: null })
    // Only the debounced input should drive the URL; `q` is compared, not tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const columns = useMemo(
    () =>
      exhibitionColumns({
        onTogglePublished: (e, next) =>
          publishOne.mutate(
            { id: e.id, isPublished: next },
            {
              onSuccess: () => toast.success(`${next ? 'Published' : 'Unpublished'} · ${e.title}`),
              onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not update this exhibition. Try again.'),
            },
          ),
      }),
    // `mutate` and `toast` are stable; the columns only need building once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const ids = Object.keys(selection).filter((id) => selection[id])
  const total = list.data?.total ?? 0

  const runBulk = (isPublished: boolean) =>
    bulk.mutate(
      { ids, isPublished },
      {
        onSuccess: () => {
          toast.success(`${isPublished ? 'Published' : 'Unpublished'} ${plural(ids.length)}`)
          setSelection({})
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not update the selection. Try again.'),
      },
    )

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title="Exhibitions"
        subtitle={list.data ? plural(total) : undefined}
        actions={
          <Link to="/exhibitions/new" className="inline-flex h-11 items-center gap-2.5 rounded-xs border border-ink bg-ink px-[18px] text-12 uppercase tracking-eyebrow text-paper hover:border-amber hover:bg-amber hover:text-ink">
            <Icon name="plus" /> New exhibition
          </Link>
        }
      />
      <ExhibitionFilters
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={filter('status')}
        city={city}
        cities={cities.data ?? []}
        onCity={filter('city')}
        published={published}
        onPublished={filter('published')}
      />
      {ids.length > 0 && (
        <BulkBar count={ids.length} busy={bulk.isPending} onPublish={() => runBulk(true)} onUnpublish={() => runBulk(false)} onClear={() => setSelection({})} />
      )}
      {list.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load exhibitions. Try again.</p>}
      {list.data && (
        <DataTable
          label="Exhibitions"
          data={list.data.items}
          columns={columns}
          getRowId={getRowId}
          getRowLabel={getRowLabel}
          selectable
          selection={selection}
          onSelectionChange={setSelection}
          empty="No exhibitions match."
        />
      )}
      {list.data && total > EXHIBITIONS_PAGE_SIZE && (
        <Pager page={page} limit={EXHIBITIONS_PAGE_SIZE} total={total} onPage={(p) => update({ page: p > 1 ? String(p) : null })} />
      )}
    </div>
  )
}
