/* eslint-disable @next/next/no-img-element -- Uploaded media are served from the bucket at stored sizes; next/image has nothing to optimise in the CMS. */
import type { ReactNode } from 'react'
import { cx } from './cx'

export type ImageRatio = '3/2' | '4/5' | '1/1' | '4/3' | '3/4'
const RATIO: Record<ImageRatio, string> = {
  '3/2': 'aspect-[3/2]',
  '4/5': 'aspect-[4/5]',
  '1/1': 'aspect-square',
  '4/3': 'aspect-[4/3]',
  '3/4': 'aspect-[3/4]',
}

type Props = {
  ratio: ImageRatio
  src?: string | null
  alt?: string
  placeholder?: string
  /** Buttons shown on hover or keyboard focus within the slot. */
  overlay?: ReactNode
  className?: string
}

export function ImageSlot({ ratio, src, alt = '', placeholder = 'No image', overlay, className }: Props) {
  return (
    <div className={cx('group relative overflow-hidden border border-line bg-img-ph', RATIO[ratio], className)}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-4 text-center text-12 uppercase tracking-eyebrow text-muted">{placeholder}</div>
      )}
      {overlay && (
        <div className="absolute inset-x-0 bottom-0 flex gap-1.5 bg-gradient-to-t from-scrim to-transparent p-2.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          {overlay}
        </div>
      )}
    </div>
  )
}
