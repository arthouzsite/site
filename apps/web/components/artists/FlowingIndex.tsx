import type { PublicArtist } from '@arthouz/shared'
import Link from 'next/link'

export function FlowingIndex({ artists }: { artists: PublicArtist[] }) {
  return (
    <p className="mt-6 mb-0 font-display text-[clamp(30px,4.2vw,64px)] leading-[1.2] text-pretty">
      {artists.map((artist, index) => (
        <span key={artist.id}>
          <Link href={`/artists/${artist.slug}`} className="hit-44 text-ink hover:text-rust">
            {artist.name}
          </Link>
          <span aria-hidden="true" className="px-[0.3em] text-amber">
            {index < artists.length - 1 ? '·' : ''}
          </span>
        </span>
      ))}
    </p>
  )
}
