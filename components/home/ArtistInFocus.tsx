import type { PublicHome } from '@/lib/shared'
import { Container } from '@/components/site/Container'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ImageSlot } from '@/components/site/ImageSlot'
import { TextLink } from '@/components/site/TextLink'
import { coverSizes } from './coverSizes'

type Props = { focus: PublicHome['focus'] }

const HEADING_ID = 'home-focus-title'
const IMAGE_RATIO = 1
const IMAGE_WIDTHS = [{ media: '(min-width: 1440px)', width: '660px' }, { media: '(min-width: 940px)', width: '50vw' }, { width: '100vw' }]

/** Square work image beside the featured artist's medium, name, text and link. */
export function ArtistInFocus({ focus }: Props) {
  const { artist } = focus
  return (
    <section aria-labelledby={HEADING_ID}>
      <Container className="pb-[clamp(72px,9vw,140px)]">
        <h2 id={HEADING_ID} className="m-0 mb-10 border-t border-ink pt-[18px] text-[12.5px] font-medium tracking-[0.18em] uppercase">
          Artist in focus
        </h2>
        <div className="flex flex-wrap items-center gap-x-[clamp(32px,6vw,120px)] gap-y-10">
          <ImageSlot
            image={focus.image}
            ratio="1/1"
            sizes={coverSizes(focus.image, IMAGE_RATIO, IMAGE_WIDTHS)}
            placeholder="Artist work"
            className="min-w-0 flex-[1_1_440px]"
          />
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-6">
            <Eyebrow>
              {focus.mediumLabel} · {focus.baseLabel}
            </Eyebrow>
            {artist && <div className="font-display text-[clamp(48px,6vw,96px)] leading-[0.92]">{artist.name}</div>}
            <p className="m-0 max-w-[560px] text-[16.5px] leading-[1.7] text-pretty text-body">{focus.text}</p>
            {artist && (
              <TextLink href={`/artists/${artist.slug}`} underline className="self-start">
                View artist →
              </TextLink>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
