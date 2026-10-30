import { useState } from 'react'
import { Button, ConfirmModal, Dialog } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { errorMessage, inUseDetails, isConflict } from './errors'
import type { AdminArtist, ArtistInUseDetails } from './types'
import { useDeleteArtist } from './useArtists'

type Props = { artist: AdminArtist | null; onClose: () => void }

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export function DeleteArtistFlow({ artist, onClose }: Props) {
  const remove = useDeleteArtist()
  const toast = useToast()
  const [blocked, setBlocked] = useState<{ name: string; details: ArtistInUseDetails } | null>(null)

  const confirm = async () => {
    if (!artist) return
    try {
      await remove.mutateAsync(artist.id)
      toast.success(`Deleted · ${artist.name}`)
    } catch (err) {
      if (isConflict(err, 'ARTIST_IN_USE')) setBlocked({ name: artist.name, details: inUseDetails(err) })
      else toast.error(err instanceof ApiError ? errorMessage(err) : 'Could not delete this artist.')
    }
    onClose()
  }

  return (
    <>
      <ConfirmModal
        open={Boolean(artist)}
        danger
        busy={remove.isPending}
        title={`Delete ${artist?.name ?? 'artist'}?`}
        body="This permanently removes the artist. It cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirm}
        onCancel={onClose}
      />
      <Dialog
        open={Boolean(blocked)}
        role="alertdialog"
        title={`${blocked?.name ?? 'This artist'} can't be deleted`}
        onClose={() => setBlocked(null)}
        footer={<Button variant="primary" data-autofocus onClick={() => setBlocked(null)}>Close</Button>}
      >
        {blocked && <BlockedBody details={blocked.details} />}
      </Dialog>
    </>
  )
}

function BlockedBody({ details }: { details: ArtistInUseDetails }) {
  const { exhibitions, workCount, artworkCount } = details
  return (
    <div className="flex flex-col gap-3">
      {exhibitions.length > 0 && (
        <div>
          <p className="m-0">Remove the artist from:</p>
          <ul className="m-0 list-none p-0">
            {exhibitions.map((e) => (
              <li key={e.id} className="flex min-h-11 items-center border-b border-line text-14 text-ink">{e.title}</li>
            ))}
          </ul>
        </div>
      )}
      {artworkCount > 0 && <p className="m-0">Delete {plural(artworkCount, 'selected work')}.</p>}
      {workCount > 0 && <p className="m-0">{plural(workCount, 'exhibition work')} use this artist.</p>}
    </div>
  )
}
