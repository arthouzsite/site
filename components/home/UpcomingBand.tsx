import type { PublicExhibition } from '@/lib/shared'
import Link from 'next/link'
import { Container } from '@/components/site/Container'
import { ImageSlot } from '@/components/site/ImageSlot'
import { coverSizes } from './coverSizes'

type Props = { exhibition: PublicExhibition }

const HEADING_ID = 'home-upcoming-title'
const IMAGE_RATIO = 3 / 2
const IMAGE_WIDTHS = [{ media: '(min-width: 1440px)', width: '640px' }, { media: '(min-width: 860px)', width: '46vw' }, { width: '100vw' }]

/** Dark band linking to the next upcoming exhibition: image left, text right. */
export function UpcomingBand({ exhibition }: Props) {
  return (
    <section aria-labelledby={HEADING_ID}>
      <Container className="pb-[clamp(72px,9vw,140px)]">
        <Link href={`/exhibitions/${exhibition.slug}`} className="flex flex-wrap items-stretch gap-0 bg-ink text-paper hover:text-paper">
          <div className="relative min-h-[320px] min-w-0 flex-[1_1_360px]">
            {/* Like the prototype's <image-slot> (width/height 100%, aspect-ratio 3/2): at least 3:2 tall, stretched to the text column. */}
            <ImageSlot
              image={exhibition.image}
              ratio="3/2"
              sizes={coverSizes(exhibition.image, IMAGE_RATIO, IMAGE_WIDTHS)}
              placeholder="Upcoming exhibition"
              className="h-full w-full"
            />
          </div>
          <div className="flex min-w-0 flex-[1_1_420px] flex-col justify-between gap-8 p-[clamp(28px,4vw,56px)]">
            <div className="text-[12px] tracking-[0.18em] text-amber uppercase">
              Upcoming · {exhibition.city}, {exhibition.country}
            </div>
            <div>
              <h2 id={HEADING_ID} className="m-0 mb-4 font-display text-[clamp(40px,5vw,76px)] leading-[0.95] font-normal">
                {exhibition.title}
              </h2>
              <div className="font-display text-[24px] text-ondark italic">{exhibition.subtitle}</div>
            </div>
            <div className="flex flex-wrap justify-between gap-3 border-t border-line-dark-20 pt-[18px] text-[14px] text-ondark">
              <span>{exhibition.datesLabel}</span>
              <span className="text-[12.5px] tracking-[0.16em] text-paper uppercase">Preview →</span>
            </div>
          </div>
        </Link>
      </Container>
    </section>
  )
}
