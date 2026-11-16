import { useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Link, useSearchParams } from 'react-router'
import { PageHead } from '../../components/PageHead'
import { DataTable, Icon, Input, LinkButton, Pager, RowSwitch } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useDebouncedValue } from '../media/useDebouncedValue'
import type { AdminService } from './types'
import { usePublishService, useServices } from './useServices'

/** The API's maximum page size: services are few, so the whole set normally fits one page. */
const PAGE_SIZE = 200
const SEARCH_DEBOUNCE_MS = 250
const SUMMARY_MAX_CHARS = 100

const truncate = (text: string) => (text.length > SUMMARY_MAX_CHARS ? `${text.slice(0, SUMMARY_MAX_CHARS).trimEnd()}…` : text)

export default function ServicesPage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [search, setSearch] = useState(q)
  const debounced = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const list = useServices({ q, page, limit: PAGE_SIZE })
  const publish = usePublishService()
  const items = list.data?.items
  const total = list.data?.total ?? 0

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
    // Only the debounced input drives the URL; `q` is compared, not tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const columns = useMemo<ColumnDef<AdminService, unknown>[]>(() => {
    const run = (op: Promise<unknown>, fallback: string) =>
      op.catch((err: unknown) => toast.error(err instanceof ApiError ? err.message : fallback))
    return [
      {
        id: 'serial',
        header: 'S.No',
        cell: ({ row }) => <span className="text-13 tabular-nums text-muted">{(page - 1) * PAGE_SIZE + row.index + 1}</span>,
      },
      {
        id: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <Link to={`/services/${row.original.id}`} className="block max-w-[320px] whitespace-normal py-2.5 text-14 text-ink underline-offset-2 hover:underline">{row.original.title}</Link>
        ),
      },
      {
        id: 'summary',
        header: 'Summary',
        cell: ({ row }) => <span className="block max-w-[420px] whitespace-normal text-13 text-muted">{row.original.summary ? truncate(row.original.summary) : '—'}</span>,
      },
      {
        id: 'published',
        header: 'Published',
        cell: ({ row }) => (
          <RowSwitch
            label={`Published: ${row.original.title}`}
            checked={row.original.isPublished}
            disabled={publish.isPending}
            onChange={(e) => void run(publish.mutateAsync({ id: row.original.id, isPublished: e.target.checked }), 'Could not change publish state')}
          />
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <Link to={`/services/${row.original.id}`} aria-label={`Edit ${row.original.title}`}
            className="inline-grid h-11 w-11 place-items-center text-muted hover:bg-hover-ink hover:text-ink"><Icon name="edit" /></Link>
        ),
      },
    ]
  }, [page, publish, toast])

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Services" subtitle={list.data ? `${total} ${total === 1 ? 'service' : 'services'}` : undefined}
        actions={<LinkButton to="/services/new" variant="primary"><Icon name="plus" />Add service</LinkButton>} />
      <div className="flex min-w-[240px] max-w-md flex-col gap-1.5">
        <label htmlFor="services-search" className="text-12 font-medium tracking-label text-body">Search services</label>
        <Input id="services-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title or summary" />
      </div>
      {list.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load services. Try again.</p>}
      {items && (
        <>
          <DataTable label={`Services A to Z, ${total} ${total === 1 ? 'record' : 'records'}`} data={items} columns={columns} getRowId={(s) => s.id} empty={q ? 'No services match.' : 'No services yet.'} />
          {total > PAGE_SIZE && <Pager page={page} limit={PAGE_SIZE} total={total} onPage={(p) => update({ page: p > 1 ? String(p) : null })} />}
        </>
      )}
    </div>
  )
}
