import type { PublicNews } from '@/lib/shared'
import { ImageSlot } from '@/components/site/ImageSlot'
import { coverSizes } from './coverSizes'

type Props = { item: PublicNews }

const IMAGE_RATIO = 3 / 2
const IMAGE_WIDTHS = [
  { media: '(min-width: 1440px)', width: '420px' },
  { media: '(min-width: 1040px)', width: '30vw' },
  { media: '(min-width: 720px)', width: '46vw' },
  { width: '100vw' },
]

/** Press item: 3:2 image, month, title and excerpt. */
export function NewsCard({ item }: Props) {
  return (
    <article className="flex flex-col gap-[14px]">
      <ImageSlot image={item.image} ratio="3/2" sizes={coverSizes(item.image, IMAGE_RATIO, IMAGE_WIDTHS)} placeholder="Press image" />
      <div className="text-[12px] tracking-[0.16em] text-muted uppercase">{item.monthLabel}</div>
      <h3 className="m-0 font-display-tamil text-[26px] leading-[1.15] font-normal text-balance">{item.title}</h3>
      <div className="text-[14.5px] leading-[1.6] text-pretty text-muted">{item.excerpt}</div>
    </article>
  )
}
