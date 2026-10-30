import { useState } from 'react'
import { Button, ConfirmModal, OrderedList } from '../../components/ui'
import type { MoveDirection } from '../../components/ui/OrderedList'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { FormCard } from './FormCard'
import { ImportWorkDialog } from './ImportWorkDialog'
import type { ArtistLite, ExhibitionWork } from './types'
import { useExhibitionWorks, useRemoveWork, useReorderWorks } from './useExhibitionWorks'
import { WorkDialog } from './WorkDialog'

type Props = { exhibitionId: string | undefined; artists: ArtistLite[] }
type Dialogs = 'add' | 'import' | null

function WorkRow({ work }: { work: ExhibitionWork }) {
  const detail = [work.artist.name, work.medium].filter(Boolean).join(' · ')
  return (
    <span className="flex items-center gap-3">
      {work.image ? (
        <img src={work.image.thumbUrl} alt="" width={36} height={36} className="h-9 w-9 shrink-0 object-cover" />
      ) : (
        <span className="h-9 w-9 shrink-0 bg-img-ph" aria-hidden="true" />
      )}
      <span className="min-w-0 truncate">
        <span className="font-display text-17">{work.title}</span>
        {work.year && <span>, {work.year}</span>}
        <span className="ml-3 text-12 text-muted">{detail}</span>
      </span>
    </span>
  )
}

export function WorksCard({ exhibitionId, artists }: Props) {
  const [dialog, setDialog] = useState<Dialogs>(null)
  const [removing, setRemoving] = useState<ExhibitionWork | null>(null)
  const works = useExhibitionWorks(exhibitionId)
  const reorder = useReorderWorks(exhibitionId ?? '')
  const remove = useRemoveWork(exhibitionId ?? '')
  const toast = useToast()
  const list = works.data ?? []
  const disabled = !exhibitionId

  const move = (id: string, dir: MoveDirection) => {
    const from = list.findIndex((w) => w.id === id)
    const to = dir === 'up' ? from - 1 : from + 1
    if (from < 0 || to < 0 || to >= list.length) return
    const next = list.map((w) => w.id)
    ;[next[from], next[to]] = [next[to]!, next[from]!]
    reorder.mutate(next, { onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not save the order. Try again.') })
  }

  const confirmRemove = async () => {
    if (!removing) return
    try {
      await remove.mutateAsync(removing.id)
      toast.success(`Removed work · ${removing.title}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not remove this work. Try again.')
    }
    setRemoving(null)
  }

  return (
    <FormCard
      title="Works in the exhibition"
      count={disabled ? undefined : list.length}
      actions={
        <>
          <Button size="sm" disabled={disabled} onClick={() => setDialog('add')}>Add work</Button>
          <Button size="sm" disabled={disabled || artists.length === 0} onClick={() => setDialog('import')}>Import from artist&apos;s works</Button>
        </>
      }
    >
      {disabled && <p className="m-0 text-13 text-muted">Save the exhibition first</p>}
      {!disabled && works.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load the works. Try again.</p>}
      {!disabled && works.isSuccess && list.length === 0 && <p className="m-0 text-13 text-muted">No works yet.</p>}
      {list.length > 0 && (
        <OrderedList
          label="Works in the exhibition"
          items={list.map((w) => ({ ...w, name: w.title }))}
          onMove={move}
          onRemove={(id) => setRemoving(list.find((w) => w.id === id) ?? null)}
          renderItem={(w) => <WorkRow work={w} />}
        />
      )}
      {exhibitionId && (
        <>
          <WorkDialog open={dialog === 'add'} onClose={() => setDialog(null)} exhibitionId={exhibitionId} artists={artists} />
          <ImportWorkDialog open={dialog === 'import'} onClose={() => setDialog(null)} exhibitionId={exhibitionId} artists={artists} works={list} />
        </>
      )}
      <ConfirmModal
        open={removing !== null}
        title={`Remove ${removing?.title ?? 'this work'}?`}
        body="The work leaves this exhibition. The image and any artist record stay in the CMS."
        confirmLabel="Remove work"
        danger
        busy={remove.isPending}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </FormCard>
  )
}
