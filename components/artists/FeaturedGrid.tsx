import type { PublicArtist } from '@/lib/shared'
import Link from 'next/link'
import { ImageSlot } from '@/components/site/ImageSlot'

const FEATURED_IMAGE_SIZES = '(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 100vw'

export function FeaturedGrid({ artists }: { artists: PublicArtist[] }) {
  return (
    <div className="mb-[clamp(64px,8vw,112px)] grid gap-x-[clamp(16px,2vw,28px)] gap-y-9" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,220px),1fr))' }}>
      {artists.map((artist) => (
        <Link key={artist.id} href={`/artists/${artist.slug}`} className="group flex flex-col gap-3 text-ink">
          <ImageSlot image={artist.image} ratio="3/4" sizes={FEATURED_IMAGE_SIZES} placeholder={artist.name} />
          <div className="font-display text-[24px] leading-[1.1] group-hover:text-rust">{artist.name}</div>
          <div className="text-[12px] tracking-[0.14em] text-muted uppercase">{artist.medium}</div>
        </Link>
      ))}
    </div>
  )
}
