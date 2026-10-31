/* eslint-disable @next/next/no-img-element -- Uploaded media are served from the bucket at stored sizes; next/image has nothing to optimise in the CMS. */
import { useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Link, useSearchParams } from 'react-router'
import { PageHead } from '../../components/PageHead'
import { Chip, DataTable, Icon, Input, LinkButton, Pager, RowSwitch, Select } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { useToast } from '../../lib/toast'
import { useDebouncedValue } from '../media/useDebouncedValue'
import { hasTamil, type AdminNews, type NewsQuery } from './types'
import { useNewsList, usePublishNews } from './useNews'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 250

export default function NewsListPage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const published = (['true', 'false'].includes(params.get('published') ?? '') ? params.get('published') : '') as NewsQuery['published']
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [search, setSearch] = useState(q)
  const debounced = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const list = useNewsList({ q, published, page, limit: PAGE_SIZE })
  const publish = usePublishNews()

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

  const columns = useMemo<ColumnDef<AdminNews, unknown>[]>(() => [
    {
      id: 'image',
      header: () => <span className="sr-only">Image</span>,
      cell: ({ row }) => row.original.image
        ? <img src={row.original.image.thumbUrl} alt="" width={56} height={42} loading="lazy" className="h-[42px] w-14 object-cover" />
        : <span className="block h-[42px] w-14 bg-img-ph" aria-hidden="true" />,
    },
    {
      id: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const tamil = hasTamil(row.original.title)
        return (
          <Link to={`/news/${row.original.id}`} lang={tamil ? 'ta' : undefined}
            className={`block max-w-[420px] whitespace-normal py-2 underline-offset-2 hover:underline ${tamil ? 'font-display text-17 leading-[1.25]' : 'text-14'} text-ink`}>
            {row.original.title}
          </Link>
        )
      },
    },
    { id: 'date', header: 'Date', cell: ({ row }) => <span className="text-13 text-muted">{row.original.monthLabel}</span> },
    {
      id: 'exhibition',
      header: 'Exhibition',
      cell: ({ row }) => row.original.exhibition
        ? <Chip className="max-w-[220px] truncate normal-case tracking-normal">{row.original.exhibition.title}</Chip>
        : <span className="text-muted" aria-label="None">—</span>,
    },
    {
      id: 'link',
      header: 'Link',
      cell: ({ row }) => row.original.externalUrl
        ? <span className="inline-grid h-11 w-11 place-items-center text-muted" title="External article set"><Icon name="external" /><span className="sr-only">External article set</span></span>
        : null,
    },
    {
      id: 'published',
      header: 'Published',
      cell: ({ row }) => (
        <RowSwitch label={`Published: ${row.original.title}`} checked={row.original.isPublished} disabled={publish.isPending}
          onChange={(e) => {
            publish.mutateAsync({ id: row.original.id, isPublished: e.target.checked })
              .catch((err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Could not change publish state'))
          }} />
      ),
    },
    { id: 'updated', header: 'Updated', cell: ({ row }) => <span className="text-13 text-muted">{row.original.updatedAt ? formatDate(row.original.updatedAt) : '—'}</span> },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <Link to={`/news/${row.original.id}`} aria-label={`Edit ${row.original.title}`} className="inline-grid h-11 w-11 place-items-center text-muted hover:bg-hover-ink hover:text-ink"><Icon name="edit" /></Link>
      ),
    },
  ], [publish, toast])

  const total = list.data?.total ?? 0

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="News" subtitle={list.data ? `${total} ${total === 1 ? 'item' : 'items'}` : undefined}
        actions={<LinkButton to="/news/new" variant="primary"><Icon name="plus" />Add news</LinkButton>} />
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-[240px] flex-1 flex-col gap-1.5">
          <label htmlFor="news-search" className="text-12 font-medium tracking-label text-body">Search news</label>
          <Input id="news-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title or excerpt" />
        </div>
        <div className="flex w-48 flex-col gap-1.5">
          <label htmlFor="news-status" className="text-12 font-medium tracking-label text-body">Status</label>
          <Select id="news-status" value={published} onChange={(e) => update({ published: e.target.value || null, page: null })}>
            <option value="">All</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </Select>
        </div>
      </div>
      {list.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load news. Try again.</p>}
      {list.data && (
        <>
          <DataTable label="News items, newest first" data={list.data.items} columns={columns} getRowId={(n) => n.id} empty={q || published ? 'No news matches.' : 'No news yet.'} />
          {total > PAGE_SIZE && <Pager page={page} limit={PAGE_SIZE} total={total} onPage={(p) => update({ page: p > 1 ? String(p) : null })} />}
        </>
      )}
    </div>
  )
}
