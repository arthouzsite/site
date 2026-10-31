import type { PublicAbout } from '@/lib/shared'
import Link from 'next/link'
import { ImageSlot } from '@/components/site/ImageSlot'

const IMAGE_SIZES = '(min-width: 1024px) 45vw, 100vw'

/** Statement, interior image with body copy, and the locations link row. */
export function GalleryTab({ gallery }: { gallery: PublicAbout['gallery'] }) {
  return (
    <>
      <p className="m-0 mb-[clamp(40px,5vw,72px)] max-w-[1100px] font-display text-[clamp(32px,4.4vw,68px)] leading-[1.08] text-balance">{gallery.statement}</p>
      <div className="mb-[clamp(64px,8vw,120px)] flex flex-wrap gap-x-[clamp(32px,6vw,120px)] gap-y-10">
        <ImageSlot image={gallery.image} ratio="4/3" sizes={IMAGE_SIZES} placeholder="Gallery interior" className="min-w-0 flex-[1_1_420px]" />
        <p className="m-0 max-w-[600px] flex-[1_1_380px] text-[17px] leading-[1.7] text-pretty text-body">{gallery.body}</p>
      </div>
      <Link
        href="/visit"
        className="flex items-center justify-between gap-6 border-y border-ink py-7 font-display text-[clamp(28px,3vw,44px)]"
      >
        <span>{gallery.locationsLabel}</span>
        <span aria-hidden="true">→</span>
      </Link>
    </>
  )
}
