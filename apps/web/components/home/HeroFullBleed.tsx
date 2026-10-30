import type { PublicExhibition } from '@arthouz/shared'
import { Container } from '@/components/site/Container'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ImageSlot } from '@/components/site/ImageSlot'
import { PrimaryButton } from '@/components/site/PrimaryButton'
import { fullWidthCoverSizes } from './coverSizes'

type Props = { exhibition: PublicExhibition }

const HEADING_ID = 'home-hero-title'
/** Must equal the image box's `h-[…]` below; the cover-cropped image renders at least this tall. */
const IMAGE_HEIGHT = 'clamp(420px, 76vh, 860px)'

/** Full-width image band, then title block left and artists, dates and CTA right. */
export function HeroFullBleed({ exhibition }: Props) {
  return (
    <section aria-labelledby={HEADING_ID}>
      <div className="relative h-[clamp(420px,76vh,860px)] w-full bg-imgph">
        <ImageSlot image={exhibition.image} fill sizes={fullWidthCoverSizes(exhibition.image, IMAGE_HEIGHT)} priority placeholder="Exhibition image" />
      </div>
      <Container className="flex flex-wrap items-end justify-between gap-x-16 gap-y-8 pt-[clamp(28px,4vw,48px)] pb-[clamp(64px,8vw,120px)]">
        <div className="min-w-0 flex-[1_1_560px]">
          {/* The city is its own flex item, as in the prototype, so the eyebrow's 10 px gap follows the dot. */}
          <Eyebrow dot className="mb-[18px]">
            Now on view ·<span>{exhibition.city}</span>
          </Eyebrow>
          <h1
            id={HEADING_ID}
            className="m-0 font-display text-[clamp(52px,8vw,128px)] leading-[0.92] font-normal tracking-[-0.015em] text-balance"
          >
            {exhibition.title}
          </h1>
          <div className="mt-4 font-display text-[clamp(22px,2.2vw,30px)] text-body italic">{exhibition.subtitle}</div>
        </div>
        <div className="flex flex-[0_1_340px] flex-col gap-5 pb-2">
          <div className="text-[15px] leading-[1.55] text-body">
            {exhibition.artistLine}
            <br />
            <span className="text-muted">{exhibition.datesLabel}</span>
          </div>
          <PrimaryButton href={`/exhibitions/${exhibition.slug}`}>
            View exhibition <span aria-hidden="true">→</span>
          </PrimaryButton>
        </div>
      </Container>
    </section>
  )
}
