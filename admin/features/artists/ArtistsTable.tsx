/* eslint-disable @next/next/no-img-element -- Uploaded media are served from the bucket at stored sizes; next/image has nothing to optimise in the CMS. */
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { Button, DataTable, Icon } from '../../components/ui'
import { formatDate } from '../../lib/format'
import type { AdminArtist } from './types'
import { ToggleCell } from './ToggleCell'
import { useFeatureArtist, usePublishArtist } from './useArtists'

type Props = { artists: AdminArtist[]; featuredCount: number; onDelete: (artist: AdminArtist) => void }

function Portrait({ artist }: { artist: AdminArtist }) {
  const src = artist.portraitImage?.thumbUrl
  return src ? (
    <img src={src} alt="" width={34} height={42} className="h-[42px] w-[34px] bg-img-ph object-cover" />
  ) : (
    <span className="block h-[42px] w-[34px] bg-img-ph" aria-hidden="true" />
  )
}

export function ArtistsTable({ artists, featuredCount, onDelete }: Props) {
  const publish = usePublishArtist()
  const feature = useFeatureArtist()
  const busy = publish.isPending || feature.isPending
  const { mutate: setPublished } = publish
  const { mutate: setFeatured } = feature

  const columns = useMemo<ColumnDef<AdminArtist, unknown>[]>(
    () => [
      { id: 'portrait', header: () => <span className="sr-only">Portrait</span>, cell: ({ row }) => <Portrait artist={row.original} /> },
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div>
            <Link to={`/artists/${row.original.id}`} className="text-14 text-ink hover:text-rust">{row.original.name}</Link>
            {row.original.sortName !== row.original.name && <span className="mt-0.5 block text-12 text-muted">Sorted as {row.original.sortName}</span>}
          </div>
        ),
      },
      { id: 'medium', header: 'Medium', cell: ({ row }) => <span className="text-13 text-muted">{row.original.medium}</span> },
      { id: 'base', header: 'Base', cell: ({ row }) => <span className="text-13 text-muted">{row.original.base}</span> },
      { id: 'works', header: () => <span className="block text-right">Works</span>, cell: ({ row }) => <span className="block text-right tabular-nums">{row.original.artworkCount}</span> },
      {
        id: 'featured',
        header: 'Featured',
        cell: ({ row }) => (
          <span className="flex items-center">
            <ToggleCell
              label={`Featured: ${row.original.name}`}
              checked={row.original.isFeatured}
              disabled={busy}
              onChange={(e) => setFeatured({ id: row.original.id, isFeatured: e.target.checked })}
            />
            {row.original.isFeatured && <span className="text-12 tabular-nums text-rust">{row.original.featuredOrder} of {featuredCount}</span>}
          </span>
        ),
      },
      {
        id: 'published',
        header: 'Published',
        cell: ({ row }) => (
          <ToggleCell
            label={`Published: ${row.original.name}`}
            checked={row.original.isPublished}
            disabled={busy}
            onChange={(e) => setPublished({ id: row.original.id, isPublished: e.target.checked })}
          />
        ),
      },
      { id: 'updated', header: 'Updated', cell: ({ row }) => <span className="text-13 text-muted">{formatDate(row.original.updatedAt)}</span> },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <span className="flex">
            <Link to={`/artists/${row.original.id}`} aria-label={`Edit ${row.original.name}`} className="inline-flex h-11 w-11 items-center justify-center text-muted hover:text-ink">
              <Icon name="edit" />
            </Link>
            <Button variant="ghost" iconOnly aria-label={`Delete ${row.original.name}`} onClick={() => onDelete(row.original)}>
              <Icon name="trash" />
            </Button>
          </span>
        ),
      },
    ],
    [busy, setFeatured, setPublished, featuredCount, onDelete],
  )

  return <DataTable label="Artists" data={artists} columns={columns} getRowId={(a) => a.id} empty="No artists match these filters." />
}
