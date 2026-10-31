import type { PublicFair } from '@/lib/shared'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ImageSlot } from '@/components/site/ImageSlot'

const IMAGE_SIZES = '(min-width: 1024px) 50vw, 100vw'

/** One fair: 3:2 image beside location, title, booth and text. */
export function FairRow({ fair }: { fair: PublicFair }) {
  return (
    <article className="flex flex-wrap gap-x-[clamp(28px,4vw,72px)] gap-y-7 border-t border-line-18 py-10">
      <ImageSlot image={fair.image} ratio="3/2" sizes={IMAGE_SIZES} placeholder={fair.title} className="min-w-0 flex-[1_1_420px]" />
      <div className="flex min-w-0 flex-[1_1_340px] flex-col justify-center gap-[18px]">
        <Eyebrow>{fair.where}</Eyebrow>
        <h2 className="m-0 font-display text-[clamp(34px,3.8vw,58px)] leading-[1.02] font-normal">{fair.title}</h2>
        <div className="text-[14px] text-muted">{fair.booth}</div>
        <p className="m-0 max-w-[560px] text-[16px] leading-[1.6] text-pretty text-body">{fair.text}</p>
      </div>
    </article>
  )
}
