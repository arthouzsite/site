import { useState } from 'react'
import type { ImageRatio } from '../../components/ui/ImageSlot'
import { ImageField } from '../media/ImageField'
import { toMediaRef, type MediaRef } from '../media/types'
import { useMediaDetail } from '../media/useMedia'

type Props = { imageId: string | null; onChange: (id: string | null) => void; ratio: ImageRatio; label: string }

/** Settings store only an image id; this resolves the preview and keeps a picked image visible without a refetch. */
export function ImageIdField({ imageId, onChange, ratio, label }: Props) {
  const [picked, setPicked] = useState<MediaRef | null>(null)
  const needsLookup = imageId !== null && picked?.id !== imageId
  const detail = useMediaDetail(imageId ?? '', needsLookup)
  const value = imageId === null ? null : picked?.id === imageId ? picked : detail.data ? toMediaRef(detail.data) : null

  return (
    <ImageField
      label={label}
      ratio={ratio}
      value={value}
      onChange={(ref) => {
        setPicked(ref)
        onChange(ref?.id ?? null)
      }}
    />
  )
}
