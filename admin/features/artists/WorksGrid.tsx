import { useState } from 'react'
import { ConfirmModal, Dialog, Button, Icon } from '../../components/ui'
import { useToast } from '../../lib/toast'
import { errorMessage, isConflict } from './errors'
import { SectionCard } from './SectionCard'
import type { Artwork } from './types'
import { useArtistArtworks, useDeleteArtwork, useReorderArtworks } from './useArtists'
import { WorkCard } from './WorkCard'
import { WorkDialog } from './WorkDialog'

type Props = { artistId: string | null; disabled?: boolean }
type Editing = { work: Artwork | null } | null

export function WorksGrid({ artistId, disabled }: Props) {
  const toast = useToast()
  const works = useArtistArtworks(artistId)
  const reorder = useReorderArtworks(artistId)
  const remove = useDeleteArtwork(artistId)
  const [editing, setEditing] = useState<Editing>(null)
  const [removing, setRemoving] = useState<Artwork | null>(null)
  const [inUse, setInUse] = useState<Artwork | null>(null)
  const items = works.data ?? []

  const move = (work: Artwork, dir: -1 | 1) => {
    const index = items.findIndex((w) => w.id === work.id)
    const target = index + dir
    if (index < 0 || target < 0 || target >= items.length) return
    const ids = items.map((w) => w.id)
    ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
    reorder.mutate(ids)
  }

  const confirmRemove = async () => {
    if (!removing) return
    const work = removing
    try {
      await remove.mutateAsync(work.id)
      toast.success(`Removed · ${work.title}`)
    } catch (err) {
      if (isConflict(err, 'ARTWORK_IN_USE')) setInUse(work)
      else toast.error(errorMessage(err))
    }
    setRemoving(null)
  }

  return (
    <SectionCard title="Selected works" note={disabled ? undefined : `${items.length} ${items.length === 1 ? 'work' : 'works'}`}>
      {disabled && <p className="m-0 text-13 text-muted">Save the artist first</p>}
      {works.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load the works.</p>}
      <ol aria-label="Selected works" className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-4.5 gap-y-6 p-0">
        {items.map((work, index) => (
          <WorkCard
            key={work.id}
            work={work}
            index={index}
            count={items.length}
            busy={reorder.isPending}
            onEdit={() => setEditing({ work })}
            onRemove={() => setRemoving(work)}
            onMove={(dir) => move(work, dir)}
          />
        ))}
        <li className="flex">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEditing({ work: null })}
            className="flex aspect-square w-full flex-col items-center justify-center gap-2.5 border border-dashed border-line-strong bg-surface-2 p-4 text-13 text-muted transition-colors hover:border-amber hover:bg-warn-bg disabled:opacity-45 disabled:hover:border-line-strong disabled:hover:bg-surface-2"
          >
            <Icon name="plus" />
            <strong className="font-medium text-ink">Add work</strong>
          </button>
        </li>
      </ol>
      {editing && artistId && <WorkDialog key={editing.work?.id ?? 'new'} artistId={artistId} artwork={editing.work} onClose={() => setEditing(null)} />}
      <ConfirmModal
        open={Boolean(removing)}
        danger
        busy={remove.isPending}
        title={`Remove ${removing?.title ?? 'work'}?`}
        body="This deletes the work from the artist."
        confirmLabel="Remove"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
      <Dialog
        open={Boolean(inUse)}
        role="alertdialog"
        title={`${inUse?.title ?? 'This work'} is still in use`}
        onClose={() => setInUse(null)}
        footer={<Button variant="primary" data-autofocus onClick={() => setInUse(null)}>Close</Button>}
      >
        <p className="m-0">An exhibition has imported this work. Remove it from the exhibition first, then delete it here.</p>
      </Dialog>
    </SectionCard>
  )
}
