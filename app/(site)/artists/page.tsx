import { publicArtistListSchema } from '@/lib/shared'
import type { Metadata } from 'next'
import { ArtistSearch } from '@/components/artists/ArtistSearch'
import { FlowingIndex } from '@/components/artists/FlowingIndex'
import { GroupedIndex } from '@/components/artists/GroupedIndex'
import { LetterStrip } from '@/components/artists/LetterStrip'
import { Container } from '@/components/site/Container'
import { apiGet, apiGetUncached } from '@/lib/api'
import { TAGS } from '@/lib/tags'
import { PageIntro } from '@/components/site/PageIntro'
import { loadPageDescription } from '@/lib/page-descriptions'

export const metadata: Metadata = { title: 'Artists' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

function readQuery(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value
  return raw?.trim() ?? ''
}

export default async function ArtistsPage({ searchParams }: Props) {
  const q = readQuery((await searchParams).q)
  // Free-text queries are per request: caching them would let arbitrary ?q values grow the data cache without bound.
  const [{ groups, flat, layout }, description] = await Promise.all([
    q
      ? apiGetUncached(`/public/artists?q=${encodeURIComponent(q)}`, publicArtistListSchema)
      : apiGet('/public/artists', publicArtistListSchema, [TAGS.artists]),
    loadPageDescription('artists'),
  ])
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <PageIntro title="Artists" description={description} className="mb-10" />
        <div className="mb-6 flex justify-end">
          <ArtistSearch initialQuery={q} />
        </div>
        <LetterStrip letters={groups.map((group) => group.letter)} />
        {layout === 'GROUPED' ? <GroupedIndex groups={groups} /> : <FlowingIndex artists={flat} />}
        {flat.length === 0 && <div className="py-6 font-display text-[28px] text-muted">No artists match “{q}”.</div>}
      </Container>
    </main>
  )
}
