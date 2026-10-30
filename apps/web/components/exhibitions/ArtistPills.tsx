import type { PublicExhibition } from '@arthouz/shared'
import Link from 'next/link'

export function ArtistPills({ artists }: { artists: PublicExhibition['artists'] }) {
  return (
    <div>
      <div className="mb-[14px] text-[11.5px] tracking-[0.18em] text-muted uppercase">Artists</div>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {artists.map((artist) => (
          <li key={artist.slug}>
            <Link
              href={`/artists/${artist.slug}`}
              className="flex h-11 items-center border border-ink px-[18px] text-[14px] hover:bg-ink hover:text-paper"
            >
              {artist.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
