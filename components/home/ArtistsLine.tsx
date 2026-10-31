import type { PublicHome } from '@/lib/shared'
import Link from 'next/link'
import { Fragment } from 'react'
import { Container } from '@/components/site/Container'
import { SectionRule } from '@/components/site/SectionRule'
import { TextLink } from '@/components/site/TextLink'

type Props = { artists: PublicHome['artistsLine'] }

const HEADING_ID = 'home-artists-title'

/** Artist names as one flowing paragraph, separated by amber middle dots. */
export function ArtistsLine({ artists }: Props) {
  return (
    <section aria-labelledby={HEADING_ID}>
      <Container className="pb-[clamp(72px,9vw,140px)]">
        <SectionRule title={<span id={HEADING_ID}>Artists</span>} action={<TextLink href="/artists">All artists →</TextLink>} />
        <p className="m-0 font-display text-[clamp(28px,3.6vw,52px)] leading-[1.22] text-pretty">
          {artists.map((artist, index) => (
            <Fragment key={artist.slug}>
              <Link href={`/artists/${artist.slug}`} className="hit-44 text-ink hover:text-rust">
                {artist.name}
              </Link>
              {index < artists.length - 1 && (
                <span aria-hidden="true" className="px-[0.32em] text-amber">
                  ·
                </span>
              )}
            </Fragment>
          ))}
        </p>
      </Container>
    </section>
  )
}
