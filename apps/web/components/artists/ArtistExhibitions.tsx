import type { PublicArtistDetail } from '@arthouz/shared'
import Link from 'next/link'
import { Eyebrow } from '@/components/site/Eyebrow'

export function ArtistExhibitions({ exhibitions }: { exhibitions: PublicArtistDetail['exhibitions'] }) {
  return (
    <section>
      <h2 className="m-0 mb-[6px]">
        <Eyebrow tone="muted">Exhibitions with Art Houz</Eyebrow>
      </h2>
      {exhibitions.map((exhibition) => (
        <Link
          key={exhibition.slug}
          href={`/exhibitions/${exhibition.slug}`}
          className="flex items-baseline justify-between gap-4 border-b border-line-14 py-[18px] text-ink hover:text-rust"
        >
          <span className="font-display text-[26px] leading-[1.15]">{exhibition.title}</span>
          <span className="text-[12px] tracking-[0.16em] whitespace-nowrap text-muted uppercase">{exhibition.city}</span>
        </Link>
      ))}
    </section>
  )
}
