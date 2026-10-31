import type { PublicLocation } from '@/lib/shared'
import { Container } from '@/components/site/Container'
import { ImageSlot } from '@/components/site/ImageSlot'
import { SectionRule } from '@/components/site/SectionRule'
import { TextLink } from '@/components/site/TextLink'
import { coverSizes } from './coverSizes'

type Props = { locations: readonly PublicLocation[] }

const HEADING_ID = 'home-galleries-title'
const IMAGE_RATIO = 3 / 2
const IMAGE_WIDTHS = [{ media: '(min-width: 1440px)', width: '640px' }, { media: '(min-width: 960px)', width: '46vw' }, { width: '100vw' }]

/** The gallery spaces: 3:2 image, city, address and opening hours. */
export function Galleries({ locations }: Props) {
  return (
    <section aria-labelledby={HEADING_ID}>
      <Container className="pb-[clamp(72px,9vw,140px)]">
        <SectionRule title={<span id={HEADING_ID}>Galleries</span>} action={<TextLink href="/visit">Plan a visit →</TextLink>} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-x-[clamp(24px,4vw,64px)] gap-y-14">
          {locations.map((location) => (
            <div key={location.id} className="flex flex-col gap-5">
              <ImageSlot image={location.image} ratio="3/2" sizes={coverSizes(location.image, IMAGE_RATIO, IMAGE_WIDTHS)} placeholder={`Art Houz ${location.city}`} />
              <h3 className="m-0 font-display text-[clamp(40px,4.4vw,64px)] leading-none font-normal">{location.city}</h3>
              <div className="flex flex-wrap gap-x-10 gap-y-4 text-[15px] leading-[1.55] text-body">
                <div className="flex-[1_1_220px]">{location.address}</div>
                <div className="flex-[0_1_200px]">
                  {location.days}
                  <br />
                  {location.hours}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
