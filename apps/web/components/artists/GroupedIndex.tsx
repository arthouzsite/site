import type { PublicArtistList } from '@arthouz/shared'
import Link from 'next/link'

export function GroupedIndex({ groups }: { groups: PublicArtistList['groups'] }) {
  return (
    <div>
      {groups.map((group) => (
        <section key={group.letter} id={`L-${group.letter}`} aria-label={`Artists ${group.letter}`} className="flex gap-[clamp(20px,4vw,64px)] border-b border-line-14 py-7">
          <h3 className="m-0 flex-[0_0_clamp(40px,8vw,120px)] font-display text-[clamp(40px,5vw,72px)] leading-[0.9] font-normal text-rust">{group.letter}</h3>
          <div className="min-w-0 flex-1" style={{ columns: '3 220px', columnGap: 40 }}>
            {group.items.map((artist) => (
              <Link key={artist.id} href={`/artists/${artist.slug}`} className="block py-2 text-ink [break-inside:avoid]">
                <span className="block text-[17px] leading-[1.3]">{artist.name}</span>
                <span className="mt-[2px] block text-[12.5px] text-muted">{artist.medium}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
