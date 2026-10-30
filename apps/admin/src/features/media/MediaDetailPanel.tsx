import { useRef, useState, type ChangeEvent } from 'react'
import { ConfirmModal, Button, Icon, ImageSlot } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { formatBytes, formatDate } from '../../lib/format'
import { useToast } from '../../lib/toast'
import { InUseDialog, UsageList } from './InUseDialog'
import { MediaDetailForm } from './MediaDetailForm'
import { fileName, IMAGE_MIMES, VIDEO_MIMES, type MediaUsage } from './types'
import { useDeleteMedia, useMediaDetail, useUploadMedia } from './useMedia'

type Props = { id: string; onClose: () => void; onSelect: (id: string) => void }

function usageFrom(err: ApiError): MediaUsage[] {
  const details = err.details as { usedBy?: MediaUsage[] } | undefined
  return details?.usedBy ?? []
}

function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, '')
}

export function MediaDetailPanel({ id, onClose, onSelect }: Props) {
  const toast = useToast()
  const [deleting, setDeleting] = useState(false)
  // Pause the detail query while deleting so it is not refetched (and 404s) once the row is gone.
  const detail = useMediaDetail(id, !deleting)
  const del = useDeleteMedia(id)
  const upload = useUploadMedia()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirming, setConfirming] = useState(false)
  const [blockedBy, setBlockedBy] = useState<MediaUsage[] | null>(null)

  const media = detail.data
  const isVideo = media?.kind === 'VIDEO'
  const noun = isVideo ? 'video' : 'image'

  const copyUrl = async () => {
    if (!media) return
    try {
      await navigator.clipboard.writeText(media.url)
      toast.success('URL copied')
    } catch {
      toast.error('Could not copy the URL')
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await del.mutateAsync()
      setConfirming(false)
      toast.success(`${isVideo ? 'Video' : 'Image'} deleted`)
      onClose()
    } catch (err) {
      setDeleting(false)
      setConfirming(false)
      if (err instanceof ApiError && err.code === 'MEDIA_IN_USE') setBlockedBy(usageFrom(err))
      else toast.error(err instanceof ApiError ? err.message : `Could not delete the ${noun}`)
    }
  }

  const uploadAsNewFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !media) return
    if (!media.alt.trim()) {
      toast.error(`Add alt text to this ${noun} first, it carries over to the new file`)
      return
    }
    try {
      const created = await upload.mutateAsync({ file, alt: media.alt })
      toast.success('Uploaded as a new file')
      onSelect(created.id)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Upload failed. Try again.')
    }
  }

  if (detail.isPending) return <Shell onClose={onClose} title="Loading"><p className="m-0 text-13 text-muted">Loading details</p></Shell>
  if (!media) return <Shell onClose={onClose} title="Details"><p role="alert" className="m-0 text-13 text-danger">Could not load this file.</p></Shell>

  return (
    <Shell onClose={onClose} title={fileName(media)}>
      {isVideo ? (
        // Library preview of an editor-uploaded file; caption tracks are not part of the media model.
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video controls preload="metadata" src={media.url} aria-label={media.alt} className="aspect-[4/3] w-full bg-img-ph object-contain" />
      ) : (
        <ImageSlot ratio="4/3" src={media.url} alt={media.alt} />
      )}
      <MediaDetailForm key={`${media.id}:${media.updatedAt}`} media={media} />
      <dl className="m-0 flex flex-col text-13">
        <Row label="Dimensions">{isVideo ? '—' : `${media.width} × ${media.height} px`}</Row>
        <Row label="Size">{formatBytes(media.bytes)}</Row>
        <Row label="Format">{media.mime.split('/')[1]?.toUpperCase()}</Row>
        <Row label="Uploaded">{formatDate(media.createdAt)}</Row>
        <Row label="URL">
          <span className="flex min-w-0 items-center gap-1">
            <span className="max-w-[170px] truncate text-body" title={media.url}>{shortUrl(media.url)}</span>
            <Button variant="ghost" size="sm" iconOnly aria-label="Copy URL" onClick={() => void copyUrl()}>
              <Icon name="copy" />
            </Button>
          </span>
        </Row>
      </dl>
      <section aria-labelledby="media-used-h" className="flex flex-col gap-1.5">
        <h4 id="media-used-h" className="m-0 text-12 font-medium tracking-label text-body">Used in</h4>
        {media.usedBy.length > 0 ? <UsageList usedBy={media.usedBy} /> : <p className="m-0 text-13 text-muted">Not used anywhere yet</p>}
      </section>
      <div className="flex flex-wrap justify-between gap-2">
        <Button disabled={upload.isPending} onClick={() => fileRef.current?.click()}>Upload as new file</Button>
        <input ref={fileRef} type="file" accept={isVideo ? VIDEO_MIMES : IMAGE_MIMES} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void uploadAsNewFile(e)} />
        <Button variant="danger" onClick={() => setConfirming(true)}>Delete</Button>
      </div>
      <ConfirmModal
        open={confirming}
        danger
        busy={del.isPending}
        title={`Delete this ${noun}?`}
        body={`${fileName(media)} will be removed from the library. This cannot be undone.`}
        confirmLabel={`Delete ${noun}`}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirming(false)}
      />
      <InUseDialog open={blockedBy !== null} fileName={fileName(media)} usedBy={blockedBy ?? media.usedBy} onClose={() => setBlockedBy(null)} />
    </Shell>
  )
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <aside aria-labelledby="media-detail-h" className="sticky top-[calc(var(--spacing-topbar)+24px)] max-h-[calc(100vh-var(--spacing-topbar)-48px)] self-start overflow-auto border border-line bg-surface-2 max-[1100px]:static max-[1100px]:max-h-none">
      <div className="flex items-center justify-between gap-2 border-b border-line py-1 pl-4 pr-1.5">
        <h3 id="media-detail-h" className="m-0 truncate text-13 font-medium tracking-[0.02em] text-ink">{title}</h3>
        <Button variant="ghost" size="sm" iconOnly aria-label="Close details" onClick={onClose}><Icon name="close" /></Button>
      </div>
      <div className="flex flex-col gap-4 p-4">{children}</div>
    </aside>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 border-b border-line">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 min-w-0 text-right text-ink">{children}</dd>
    </div>
  )
}
