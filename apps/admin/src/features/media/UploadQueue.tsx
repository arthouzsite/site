import { useState } from 'react'
import { ApiError } from '../../lib/api'
import { formatBytes } from '../../lib/format'
import { Button, Dropzone, Icon, Input } from '../../components/ui'
import { uploadErrorMessage, type Media } from './types'
import { useUploadMedia } from './useMedia'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif'
const HINT = 'JPEG, PNG, WebP or AVIF, up to 25 MB'

type Status = 'queued' | 'uploading' | 'error'
type Item = { id: number; file: File; alt: string; progress: number; status: Status; error: string | null }

type Props = { onUploaded?: (media: Media) => void }

let nextItemId = 1

function toItem(file: File): Item {
  return { id: nextItemId++, file, alt: '', progress: 0, status: 'queued', error: null }
}

function describe(err: unknown): string {
  if (err instanceof ApiError) return uploadErrorMessage(err)
  return 'Upload failed. Try again.'
}

export function UploadQueue({ onUploaded }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const upload = useUploadMedia()

  const patch = (id: number, changes: Partial<Item>) =>
    setItems((cur) => cur.map((it) => (it.id === id ? { ...it, ...changes } : it)))
  const remove = (id: number) => setItems((cur) => cur.filter((it) => it.id !== id))

  const pending = items.filter((it) => it.status !== 'uploading')
  const busy = items.some((it) => it.status === 'uploading')
  const ready = pending.length > 0 && !busy && pending.every((it) => it.alt.trim() !== '')

  const send = async (item: Item) => {
    patch(item.id, { status: 'uploading', progress: 0, error: null })
    try {
      const media = await upload.mutateAsync({
        file: item.file,
        alt: item.alt.trim(),
        onProgress: (progress) => patch(item.id, { progress }),
      })
      remove(item.id)
      onUploaded?.(media)
    } catch (err) {
      patch(item.id, { status: 'error', error: describe(err) })
    }
  }

  const startAll = () => {
    pending.forEach((it) => void send(it))
  }

  return (
    <div className="flex flex-col gap-3">
      <Dropzone onFiles={(files) => setItems((cur) => [...cur, ...files.map(toItem)])} accept={ACCEPT} hint={HINT} />
      {items.length > 0 && (
        <>
          <ul aria-label="Files to upload" className="m-0 list-none border-t border-line p-0">
            {items.map((it) => (
              <UploadRow key={it.id} item={it} onAlt={(alt) => patch(it.id, { alt })} onRemove={() => remove(it.id)} />
            ))}
          </ul>
          <div className="flex justify-end">
            <Button variant="primary" disabled={!ready} onClick={startAll}>
              Upload {pending.length} {pending.length === 1 ? 'file' : 'files'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

type RowProps = { item: Item; onAlt: (alt: string) => void; onRemove: () => void }

function UploadRow({ item, onAlt, onRemove }: RowProps) {
  const { file, alt, progress, status, error } = item
  const percent = Math.round(progress * 100)
  const altId = `upload-alt-${item.id}`
  return (
    <li className="flex items-start gap-3.5 border-b border-line py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center border border-line bg-surface text-muted">
        <Icon name="media" />
      </span>
      <div className="flex min-w-0 grow flex-col gap-2">
        <div className="flex items-baseline gap-3 text-13">
          <span className="min-w-0 truncate text-ink">{file.name}</span>
          <span className="text-12 text-muted">{formatBytes(file.size)}</span>
          {status === 'uploading' && <span className="text-12 text-muted">{percent}%</span>}
        </div>
        <label htmlFor={altId} className="text-12 font-medium tracking-label text-body">Alt text for {file.name}</label>
        <Input id={altId} value={alt} disabled={status === 'uploading'} onChange={(e) => onAlt(e.target.value)} aria-required="true" />
        {status === 'uploading' && (
          <div
            role="progressbar"
            aria-label={`Uploading ${file.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-1 bg-line"
          >
            <div className="h-full bg-ink" style={{ width: `${percent}%` }} />
          </div>
        )}
        {error && (
          <p role="alert" className="m-0 flex items-center gap-1.5 text-12 text-danger">
            <Icon name="alert" />
            {error}
          </p>
        )}
      </div>
      <Button variant="ghost" size="sm" aria-label={`Remove ${file.name}`} disabled={status === 'uploading'} onClick={onRemove}>
        Remove
      </Button>
    </li>
  )
}
