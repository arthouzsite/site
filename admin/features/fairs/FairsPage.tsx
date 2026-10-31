/* eslint-disable @next/next/no-img-element -- Uploaded media are served from the bucket at stored sizes; next/image has nothing to optimise in the CMS. */
import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router'
import { PageHead } from '../../components/PageHead'
import { Button, DataTable, Icon, LinkButton, RowSwitch } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { useToast } from '../../lib/toast'
import { FairPreview } from './FairPreview'
import type { AdminFair } from './types'
import { useFairs, usePublishFair, useReorderFairs } from './useFairs'

function move(ids: string[], index: number, by: -1 | 1): string[] {
  const next = [...ids]
  const [item] = next.splice(index, 1)
  next.splice(index + by, 0, item!)
  return next
}

export default function FairsPage() {
  const toast = useToast()
  const list = useFairs()
  const reorder = useReorderFairs()
  const publish = usePublishFair()
  const fairs = list.data

  const run = async (op: Promise<unknown>, fallback: string) => {
    try {
      await op
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : fallback)
    }
  }

  const columns = useMemo<ColumnDef<AdminFair, unknown>[]>(() => {
    const ids = (fairs ?? []).map((f) => f.id)
    return [
      {
        id: 'order',
        header: 'Order',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1">
            <span className="w-5 text-12 tabular-nums text-faint">{row.index + 1}</span>
            <Button variant="ghost" size="sm" iconOnly aria-label={`Move ${row.original.title} up`} disabled={row.index === 0 || reorder.isPending}
              onClick={() => void run(reorder.mutateAsync(move(ids, row.index, -1)), 'Could not reorder fairs')}><Icon name="up" /></Button>
            <Button variant="ghost" size="sm" iconOnly aria-label={`Move ${row.original.title} down`} disabled={row.index === ids.length - 1 || reorder.isPending}
              onClick={() => void run(reorder.mutateAsync(move(ids, row.index, 1)), 'Could not reorder fairs')}><Icon name="down" /></Button>
          </span>
        ),
      },
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
        cell: ({ row }) => (
          <span className="block whitespace-normal py-2.5">
            <Link to={`/fairs/${row.original.id}`} className="text-14 text-ink underline-offset-2 hover:underline">{row.original.title}</Link>
            <span className="mt-0.5 block text-13 text-muted">{row.original.where}</span>
          </span>
        ),
      },
      { id: 'booth', header: 'Booth', cell: ({ row }) => <span className="text-13 text-muted">{row.original.booth || '—'}</span> },
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
      { id: 'updated', header: 'Updated', cell: ({ row }) => <span className="text-13 text-muted">{row.original.updatedAt ? formatDate(row.original.updatedAt) : '—'}</span> },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <Link to={`/fairs/${row.original.id}`} aria-label={`Edit ${row.original.title}`}
            className="inline-grid h-11 w-11 place-items-center text-muted hover:bg-hover-ink hover:text-ink"><Icon name="edit" /></Link>
        ),
      },
    ]
    // `run` only closes over stable mutation/toast handles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fairs, reorder.isPending, publish.isPending])

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Fairs" actions={<LinkButton to="/fairs/new" variant="primary"><Icon name="plus" />New fair</LinkButton>} />
      {list.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load fairs. Try again.</p>}
      {fairs && (
        <>
          <DataTable label={`Fairs in site order, ${fairs.length} ${fairs.length === 1 ? 'record' : 'records'}`} data={fairs} columns={columns} getRowId={(f) => f.id} empty="No fairs yet." />
          {fairs[0] && <FairPreview fair={fairs[0]} />}
        </>
      )}
    </div>
  )
}
