/* eslint-disable @next/next/no-img-element -- Uploaded media are served from the bucket at stored sizes; next/image has nothing to optimise in the CMS. */
import { useState } from 'react'
import { FAIR_GALLERY_MAX_IMAGES } from '@/lib/shared'
import { Button, ConfirmModal, OrderedList } from '../../components/ui'
import type { MoveDirection } from '../../components/ui/OrderedList'
import { useToast } from '../../lib/toast'
import { FormCard } from '../exhibitions/FormCard'
import { MediaPicker } from '../media/MediaPicker'
import type { MediaRef } from '../media/types'

const LIMIT_MESSAGE = `A fair gallery holds at most ${FAIR_GALLERY_MAX_IMAGES} images`
const DUPLICATE_MESSAGE = 'That image is already in the gallery'

type Props = { images: MediaRef[]; onChange: (images: MediaRef[]) => void; error?: string }
type Entry = MediaRef & { name: string }

const withNames = (images: MediaRef[]): Entry[] => images.map((image, i) => ({ ...image, name: image.alt || `Image ${i + 1}` }))

function Thumb({ image }: { image: Entry }) {
  return (
    <span className="flex items-center gap-3">
      <img src={image.thumbUrl} alt="" width={36} height={36} className="h-9 w-9 shrink-0 object-cover" />
      <span className="min-w-0 truncate">{image.name}</span>
    </span>
  )
}

export function GalleryCard({ images, onChange, error }: Props) {
  const toast = useToast()
  const [picking, setPicking] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const entries = withNames(images)

  const open = () => {
    if (images.length >= FAIR_GALLERY_MAX_IMAGES) return toast.error(LIMIT_MESSAGE)
    setPicking(true)
  }

  const add = (ref: MediaRef) => {
    setPicking(false)
    if (images.length >= FAIR_GALLERY_MAX_IMAGES) return toast.error(LIMIT_MESSAGE)
    if (images.some((image) => image.id === ref.id)) return toast.error(DUPLICATE_MESSAGE)
    onChange([...images, ref])
  }

  const move = (id: string, dir: MoveDirection) => {
    const from = images.findIndex((image) => image.id === id)
    const to = dir === 'up' ? from - 1 : from + 1
    const target = images[to]
    const moved = images[from]
    if (!target || !moved) return
    onChange(images.map((image, i) => (i === from ? target : i === to ? moved : image)))
  }

  const confirmRemove = () => {
    onChange(images.filter((image) => image.id !== removing))
    setRemoving(null)
  }

  return (
    <FormCard
      title="Gallery"
      count={`${images.length} of ${FAIR_GALLERY_MAX_IMAGES}`}
      actions={<Button size="sm" onClick={open}>Add gallery image</Button>}
    >
      {images.length === 0 && <p className="m-0 text-13 text-muted">No gallery images yet.</p>}
      {entries.length > 0 && (
        <OrderedList label="Gallery images" items={entries} onMove={move} onRemove={setRemoving} renderItem={(image) => <Thumb image={image} />} />
      )}
      {error && <p role="alert" className="m-0 text-13 text-danger">{error}</p>}
      {picking && <MediaPicker open onClose={() => setPicking(false)} onSelect={add} />}
      <ConfirmModal
        open={removing !== null}
        title="Remove this image?"
        body="The image leaves this fair's gallery once you save. It stays in the media library."
        confirmLabel="Remove image"
        danger
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </FormCard>
  )
}
