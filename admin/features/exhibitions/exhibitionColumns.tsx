/* eslint-disable @next/next/no-img-element -- Uploaded media are served from the bucket at stored sizes; next/image has nothing to optimise in the CMS. */
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router'
import { Chip, Icon, StatusChip, Switch } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { exhibitionUrl, STATUS_TO_CHIP, type AdminExhibition } from './types'

type Options = { onTogglePublished: (e: AdminExhibition, next: boolean) => void }

export function exhibitionColumns({ onTogglePublished }: Options): ColumnDef<AdminExhibition, unknown>[] {
  return [
    {
      id: 'image',
      header: () => <span className="sr-only">Image</span>,
      cell: ({ row }) =>
        row.original.heroImage ? (
          <img src={row.original.heroImage.thumbUrl} alt="" width={56} height={42} className="h-[42px] w-14 object-cover" />
        ) : (
          <span className="block h-[42px] w-14 bg-img-ph" aria-hidden="true" />
        ),
    },
    {
      id: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div className="flex min-w-[220px] flex-col py-2.5 whitespace-normal">
          <Link to={`/exhibitions/${row.original.id}`} className="font-display text-17 hover:underline">{row.original.title}</Link>
          {row.original.subtitle && <span className="text-13 leading-snug text-muted">{row.original.subtitle}</span>}
        </div>
      ),
    },
    { id: 'type', header: 'Type', cell: ({ row }) => <Chip>{row.original.type === 'SOLO' ? 'Solo' : 'Group'}</Chip> },
    { id: 'city', header: 'City', cell: ({ row }) => row.original.city },
    {
      id: 'dates',
      header: 'Dates',
      cell: ({ row }) => <span className="block min-w-[150px] max-w-[190px] whitespace-normal text-13 leading-snug text-body">{row.original.datesLabelResolved}</span>,
    },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusChip status={STATUS_TO_CHIP[row.original.status]} label={row.original.statusLabel} /> },
    {
      id: 'published',
      header: 'Published',
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <Switch
            label=""
            aria-label={`Published: ${row.original.title}`}
            checked={row.original.isPublished}
            onChange={(e) => onTogglePublished(row.original, e.target.checked)}
          />
          {!row.original.isPublished && <StatusChip status="draft" />}
        </span>
      ),
    },
    { id: 'updated', header: 'Updated', cell: ({ row }) => <span className="text-13 text-muted">{formatDate(row.original.updatedAt)}</span> },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <span className="flex items-center">
          <Link to={`/exhibitions/${row.original.id}`} aria-label={`Edit ${row.original.title}`} className="inline-grid h-11 w-11 place-items-center text-muted hover:text-ink">
            <Icon name="edit" />
          </Link>
          <a href={exhibitionUrl(row.original.slug)} target="_blank" rel="noreferrer" aria-label={`View ${row.original.title} on site`} className="inline-grid h-11 w-11 place-items-center text-muted hover:text-ink">
            <Icon name="external" />
          </a>
        </span>
      ),
    },
  ]
}
