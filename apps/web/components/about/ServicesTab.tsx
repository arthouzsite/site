import type { PublicAbout } from '@arthouz/shared'
import { ImageSlot } from '@/components/site/ImageSlot'
import { PrimaryButton } from '@/components/site/PrimaryButton'

const IMAGE_SIZES = '(min-width: 1024px) 45vw, 100vw'

/** Framing services: image, title, body and the Enquire button. */
export function ServicesTab({ services }: { services: PublicAbout['services'] }) {
  return (
    <div className="flex flex-wrap gap-x-[clamp(32px,6vw,120px)] gap-y-10">
      <ImageSlot image={services.image} ratio="3/2" sizes={IMAGE_SIZES} placeholder={services.title} className="min-w-0 flex-[1_1_440px]" />
      <div className="flex min-w-0 flex-[1_1_380px] flex-col justify-center gap-6">
        <h2 className="m-0 font-display text-[clamp(40px,5vw,72px)] leading-[0.95] font-normal">{services.title}</h2>
        <p className="m-0 max-w-[560px] text-[17px] leading-[1.7] text-pretty text-body">{services.body}</p>
        <PrimaryButton href="/visit">{services.ctaLabel}</PrimaryButton>
      </div>
    </div>
  )
}
