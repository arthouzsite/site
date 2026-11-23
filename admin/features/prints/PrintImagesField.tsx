import { PRINT_CATEGORY_MAX_IMAGES } from '@/lib/shared'
import { Button, ConfirmModal, OrderedList } from '../../components/ui'
import { MediaListItem, withNames } from '../media/MediaListItem'
import { MediaPicker } from '../media/MediaPicker'
import type { MediaRef } from '../media/types'
import { useMediaList } from '../media/useMediaList'

const LIMIT_MESSAGE = `A print category holds at most ${PRINT_CATEGORY_MAX_IMAGES} images`
const DUPLICATE_MESSAGE = 'That image is already in this category'

type Props = { categoryName: string; images: MediaRef[]; onChange: (images: MediaRef[]) => void; error?: string }

/** The ordered images of one print category, capped at the category limit. */
export function PrintImagesField({ categoryName, images, onChange, error }: Props) {
  const list = useMediaList({ images, onChange, max: PRINT_CATEGORY_MAX_IMAGES, limitMessage: LIMIT_MESSAGE, duplicateMessage: DUPLICATE_MESSAGE })
  const entries = withNames(images)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-13 text-body">
          Images <span className="text-12 text-muted">{images.length} of {PRINT_CATEGORY_MAX_IMAGES}</span>
        </span>
        <Button size="sm" onClick={list.open} aria-label={`Add image to ${categoryName}`}>Add image</Button>
      </div>
      {entries.length > 0 && (
        <OrderedList label={`${categoryName} images`} items={entries} onMove={list.move} onRemove={list.askRemove} renderItem={(image) => <MediaListItem image={image} />} />
      )}
      {error && <p role="alert" className="m-0 text-13 text-danger">{error}</p>}
      {list.picking && <MediaPicker open onClose={list.closePicker} onSelect={list.add} />}
      <ConfirmModal
        open={list.removing !== null}
        title="Remove this image?"
        body="The image leaves this category once you save. It stays in the media library."
        confirmLabel="Remove image"
        danger
        onConfirm={list.confirmRemove}
        onCancel={list.cancelRemove}
      />
    </div>
  )
}
