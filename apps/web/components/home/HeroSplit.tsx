import type { PublicExhibition } from '@arthouz/shared'
import Link from 'next/link'
import { Container } from '@/components/site/Container'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ImageSlot } from '@/components/site/ImageSlot'
import { coverSizes } from './coverSizes'

type Props = { exhibition: PublicExhibition }

const HEADING_ID = 'home-hero-title'
const IMAGE_RATIO = 4 / 5
const IMAGE_WIDTHS = [{ media: '(min-width: 1440px)', width: '710px' }, { media: '(min-width: 1000px)', width: '50vw' }, { width: '100vw' }]

/** Text column left (eyebrow top, title block bottom), 4:5 image right. */
export function HeroSplit({ exhibition }: Props) {
  return (
    <section aria-labelledby={HEADING_ID}>
      <Container className="flex flex-wrap items-stretch gap-x-16 gap-y-10 pt-[clamp(32px,5vw,72px)] pb-[clamp(64px,8vw,120px)]">
        <div className="flex min-w-0 flex-[1_1_380px] flex-col justify-between gap-10">
          <Eyebrow dot>
            Now on view ·<span>{exhibition.city}</span>
          </Eyebrow>
          <div>
            <h1
              id={HEADING_ID}
              className="m-0 mb-5 font-display text-[clamp(52px,7vw,112px)] leading-[0.92] font-normal tracking-[-0.015em] text-balance"
            >
              {exhibition.title}
            </h1>
            <div className="mb-6 font-display text-[clamp(22px,2.2vw,30px)] text-body italic">{exhibition.subtitle}</div>
            <div className="mb-7 text-[15px] leading-[1.55] text-body">
              {exhibition.artistLine}
              <br />
              <span className="text-muted">{exhibition.datesLabel}</span>
            </div>
            {/* The split hero's CTA is inline-flex (no align-self), unlike PrimaryButton's flex + self-start. */}
            <Link
              href={`/exhibitions/${exhibition.slug}`}
              className="inline-flex items-center gap-3 bg-ink px-6 py-4 text-[12.5px] tracking-[0.16em] text-paper uppercase hover:bg-amber hover:text-ink"
            >
              View exhibition <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <div className="relative aspect-[4/5] max-h-[82vh] min-w-0 flex-[1.3_1_480px] bg-imgph">
          <ImageSlot image={exhibition.image} fill sizes={coverSizes(exhibition.image, IMAGE_RATIO, IMAGE_WIDTHS)} priority placeholder="Exhibition image" />
        </div>
      </Container>
    </section>
  )
}
