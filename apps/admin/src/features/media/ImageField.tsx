import { useState } from 'react'
import { Button, ImageSlot } from '../../components/ui'
import type { ImageRatio } from '../../components/ui/ImageSlot'
import { MediaPicker } from './MediaPicker'
import type { MediaRef } from './types'

type Props = {
  value: MediaRef | null
  onChange: (value: MediaRef | null) => void
  ratio: ImageRatio
  label: string
  help?: string
}

export function ImageField({ value, onChange, ratio, label, help }: Props) {
  const [open, setOpen] = useState(false)
  const pick = (ref: MediaRef) => {
    onChange(ref)
    setOpen(false)
  }

  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <span className="text-12 font-medium tracking-label text-body">{label}</span>
      <ImageSlot
        ratio={ratio}
        src={value?.url}
        alt={value?.alt}
        overlay={
          value ? (
            <>
              <Button size="sm" onClick={() => setOpen(true)} className="bg-surface-2">Replace</Button>
              <Button size="sm" onClick={() => onChange(null)} className="bg-surface-2">Remove</Button>
            </>
          ) : undefined
        }
      />
      {!value && <Button size="sm" className="self-start" onClick={() => setOpen(true)}>Choose image</Button>}
      {help && <p className="m-0 text-12 text-muted">{help}</p>}
      {open && <MediaPicker open onClose={() => setOpen(false)} onSelect={pick} />}
    </div>
  )
}
