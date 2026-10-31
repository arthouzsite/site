import type { PublicAbout } from '@/lib/shared'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ImageSlot } from '@/components/site/ImageSlot'

const IMAGE_SIZES = '(min-width: 1024px) 440px, 100vw'

/** Portrait beside eyebrow, name, quote and biography. */
export function ProprietorTab({ proprietor }: { proprietor: PublicAbout['proprietor'] }) {
  return (
    <div className="flex flex-wrap gap-x-[clamp(32px,6vw,120px)] gap-y-10">
      <ImageSlot image={proprietor.image} ratio="4/5" sizes={IMAGE_SIZES} placeholder={proprietor.name} className="min-w-[min(100%,280px)] flex-[0_1_440px]" />
      <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-7">
        <Eyebrow>{proprietor.eyebrow}</Eyebrow>
        <h2 className="m-0 font-display text-[clamp(40px,5vw,72px)] leading-[0.95] font-normal">{proprietor.name}</h2>
        <blockquote className="m-0 border-t border-ink pt-6 font-display text-[clamp(22px,2.2vw,30px)] leading-[1.35] text-pretty italic">
          {proprietor.quote}
        </blockquote>
        <p className="m-0 max-w-[680px] text-[16px] leading-[1.7] text-pretty text-body">{proprietor.body}</p>
      </div>
    </div>
  )
}
