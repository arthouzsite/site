import Link from 'next/link'
import type { PublicPrintCategory } from '@/lib/shared'
import { ImageSlot } from '@/components/site/ImageSlot'

const IMAGE_SIZES = '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw'

/** One category on the Prints index: its first print as the cover, the name and how many prints it holds. */
export function PrintCategoryTile({ category, priority }: { category: PublicPrintCategory; priority: boolean }) {
  const count = category.images.length
  return (
    <Link href={`/prints/${encodeURIComponent(category.slug)}`} className="group flex flex-col gap-4 text-ink hover:text-rust">
      <ImageSlot image={category.images[0] ?? null} ratio="4/5" sizes={IMAGE_SIZES} priority={priority} placeholder={category.name} className="transition-opacity duration-200 group-hover:opacity-85" />
      <span className="flex items-baseline justify-between gap-4 border-t border-line-18 pt-4">
        <span className="font-display text-[clamp(26px,2.6vw,36px)] leading-[1.05] break-words">{category.name}</span>
        <span className="shrink-0 text-[12.5px] tracking-[0.16em] text-muted uppercase tabular-nums">{count} {count === 1 ? 'print' : 'prints'}</span>
      </span>
    </Link>
  )
}
