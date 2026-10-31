import { Button, Dialog } from '../../components/ui'
import { useToast } from '../../lib/toast'
import { ApiError } from '../../lib/api'
import type { ArtistLite, ExhibitionWork } from './types'
import { useArtistsArtworks, useImportWork } from './useExhibitionWorks'

type Props = { open: boolean; onClose: () => void; exhibitionId: string; artists: ArtistLite[]; works: ExhibitionWork[] }

export function ImportWorkDialog({ open, onClose, exhibitionId, artists, works }: Props) {
  const queries = useArtistsArtworks(open ? artists.map((a) => a.id) : [])
  const importWork = useImportWork(exhibitionId)
  const toast = useToast()
  const imported = new Set(works.flatMap((w) => (w.artworkId ? [w.artworkId] : [])))

  const run = async (artworkId: string, title: string) => {
    try {
      await importWork.mutateAsync(artworkId)
      toast.success(`Added work · ${title}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not import this work. Try again.')
    }
  }

  return (
    <Dialog
      open={open}
      title="Import from artist’s works"
      onClose={onClose}
      width="w-[min(640px,calc(100vw-32px))]"
      footer={<Button variant="primary" onClick={onClose}>Done</Button>}
    >
      {artists.length === 0 && <p className="m-0 text-13 text-muted">Add artists to the exhibition first.</p>}
      <div className="flex flex-col gap-5">
        {artists.map((artist, i) => {
          const q = queries[i]
          const artworks = q?.data ?? []
          return (
            <section key={artist.id} aria-label={artist.name} className="flex flex-col gap-1">
              <h3 className="m-0 text-12 font-medium uppercase tracking-eyebrow text-muted">{artist.name}</h3>
              {q?.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load works for {artist.name}.</p>}
              {q?.isSuccess && artworks.length === 0 && <p className="m-0 text-13 text-muted">No works recorded for this artist.</p>}
              <ul className="m-0 list-none p-0">
                {artworks.map((a) => (
                  <li key={a.id} className="flex min-h-12 items-center gap-3 border-b border-line py-1.5">
                    {a.image ? <img src={a.image.thumbUrl} alt="" width={36} height={36} className="h-9 w-9 object-cover" /> : <span className="h-9 w-9 bg-img-ph" aria-hidden="true" />}
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-display text-17">{a.title}</span>
                      <span className="text-12 text-muted">{[a.year && `, ${a.year}`, a.medium && ` · ${a.medium}`].filter(Boolean).join('')}</span>
                    </span>
                    {imported.has(a.id) ? (
                      <span className="px-3 text-12 uppercase tracking-eyebrow text-success">Added</span>
                    ) : (
                      <Button size="sm" aria-label={`Import ${a.title}`} disabled={importWork.isPending} onClick={() => run(a.id, a.title)}>Import</Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </Dialog>
  )
}
