import { publicArtistListSchema } from '@/lib/shared'
import type { Metadata } from 'next'
import { ArtistSearch } from '@/components/artists/ArtistSearch'
import { FeaturedGrid } from '@/components/artists/FeaturedGrid'
import { FlowingIndex } from '@/components/artists/FlowingIndex'
import { GroupedIndex } from '@/components/artists/GroupedIndex'
import { LetterStrip } from '@/components/artists/LetterStrip'
import { Container } from '@/components/site/Container'
import { apiGet, apiGetUncached } from '@/lib/api'
import { TAGS } from '@/lib/tags'

export const metadata: Metadata = { title: 'Artists' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

function readQuery(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value
  return raw?.trim() ?? ''
}

export default async function ArtistsPage({ searchParams }: Props) {
  const q = readQuery((await searchParams).q)
  // Free-text queries are per request: caching them would let arbitrary ?q values grow the data cache without bound.
  const { featured, groups, flat, layout } = q
    ? await apiGetUncached(`/public/artists?q=${encodeURIComponent(q)}`, publicArtistListSchema)
    : await apiGet('/public/artists', publicArtistListSchema, [TAGS.artists])
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <h1 className="m-0 mb-12 font-display text-[clamp(56px,9vw,148px)] leading-[0.9] font-normal tracking-[-0.02em]">Artists</h1>
        <FeaturedGrid artists={featured} />
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <h2 className="m-0 font-display text-[clamp(36px,4vw,56px)] leading-none font-normal">Index A–Z</h2>
          <ArtistSearch initialQuery={q} />
        </div>
        <LetterStrip letters={groups.map((group) => group.letter)} />
        {layout === 'GROUPED' ? <GroupedIndex groups={groups} /> : <FlowingIndex artists={flat} />}
        {flat.length === 0 && <div className="py-6 font-display text-[28px] text-muted">No artists match “{q}”.</div>}
      </Container>
    </main>
  )
}
