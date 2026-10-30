import type { PublicExhibition } from '@arthouz/shared'
import Link from 'next/link'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ImageSlot } from '@/components/site/ImageSlot'
import { coverSizes } from './coverSizes'

type Props = { exhibition: PublicExhibition }

const IMAGE_RATIO = 4 / 5
const IMAGE_WIDTHS = [
  { media: '(min-width: 1440px)', width: '310px' },
  { media: '(min-width: 1024px)', width: '23vw' },
  { media: '(min-width: 720px)', width: '46vw' },
  { width: '100vw' },
]

/** 4:5 image, location, title (rust on hover), artists and dates; the whole card links to the exhibition. */
export function ExhibitionCard({ exhibition }: Props) {
  return (
    <Link href={`/exhibitions/${exhibition.slug}`} className="flex flex-col gap-4 text-ink">
      <ImageSlot image={exhibition.image} ratio="4/5" sizes={coverSizes(exhibition.image, IMAGE_RATIO, IMAGE_WIDTHS)} placeholder={exhibition.title} />
      <Eyebrow>
        {exhibition.city}, {exhibition.country}
      </Eyebrow>
      <h3 className="m-0 font-display text-[clamp(28px,2.6vw,38px)] leading-[1.05] font-normal text-balance hover:text-rust">
        {exhibition.title}
      </h3>
      <div className="text-[14px] leading-[1.5] text-body">{exhibition.artistLine}</div>
      <div className="text-[13.5px] text-muted">{exhibition.datesLabel}</div>
    </Link>
  )
}
