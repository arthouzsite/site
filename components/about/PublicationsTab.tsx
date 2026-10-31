import type { PublicAbout } from '@/lib/shared'
import { ImageSlot } from '@/components/site/ImageSlot'

const IMAGE_SIZES = '(min-width: 1024px) 45vw, 100vw'

/** Arts Illustrated: image, title, body and an optional outbound link. */
export function PublicationsTab({ publications }: { publications: PublicAbout['publications'] }) {
  return (
    <div className="flex flex-wrap gap-x-[clamp(32px,6vw,120px)] gap-y-10">
      <ImageSlot image={publications.image} ratio="3/2" sizes={IMAGE_SIZES} placeholder={publications.title} className="min-w-0 flex-[1_1_440px]" />
      <div className="flex min-w-0 flex-[1_1_380px] flex-col justify-center gap-6">
        <h2 className="m-0 font-display text-[clamp(40px,5vw,72px)] leading-[0.95] font-normal">{publications.title}</h2>
        <p className="m-0 max-w-[600px] text-[17px] leading-[1.7] text-pretty text-body">{publications.body}</p>
        {publications.externalUrl && (
          <a
            href={publications.externalUrl}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-3 self-start border border-ink px-6 py-4 text-[12.5px] tracking-[0.16em] uppercase hover:bg-ink hover:text-paper"
          >
            View more ↗
          </a>
        )}
      </div>
    </div>
  )
}
