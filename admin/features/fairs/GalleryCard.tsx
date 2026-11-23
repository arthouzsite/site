import { FAIR_GALLERY_MAX_IMAGES } from '@/lib/shared'
import { Button, ConfirmModal, OrderedList } from '../../components/ui'
import { FormCard } from '../exhibitions/FormCard'
import { MediaListItem, withNames } from '../media/MediaListItem'
import { MediaPicker } from '../media/MediaPicker'
import type { MediaRef } from '../media/types'
import { useMediaList } from '../media/useMediaList'

const LIMIT_MESSAGE = `A fair gallery holds at most ${FAIR_GALLERY_MAX_IMAGES} images`
const DUPLICATE_MESSAGE = 'That image is already in the gallery'

type Props = { images: MediaRef[]; onChange: (images: MediaRef[]) => void; error?: string }

export function GalleryCard({ images, onChange, error }: Props) {
  const list = useMediaList({ images, onChange, max: FAIR_GALLERY_MAX_IMAGES, limitMessage: LIMIT_MESSAGE, duplicateMessage: DUPLICATE_MESSAGE })
  const entries = withNames(images)

  return (
    <FormCard
      title="Gallery"
      count={`${images.length} of ${FAIR_GALLERY_MAX_IMAGES}`}
      actions={<Button size="sm" onClick={list.open}>Add gallery image</Button>}
    >
      {images.length === 0 && <p className="m-0 text-13 text-muted">No gallery images yet.</p>}
      {entries.length > 0 && (
        <OrderedList label="Gallery images" items={entries} onMove={list.move} onRemove={list.askRemove} renderItem={(image) => <MediaListItem image={image} />} />
      )}
      {error && <p role="alert" className="m-0 text-13 text-danger">{error}</p>}
      {list.picking && <MediaPicker open onClose={list.closePicker} onSelect={list.add} />}
      <ConfirmModal
        open={list.removing !== null}
        title="Remove this image?"
        body="The image leaves this fair's gallery once you save. It stays in the media library."
        confirmLabel="Remove image"
        danger
        onConfirm={list.confirmRemove}
        onCancel={list.cancelRemove}
      />
    </FormCard>
  )
}
