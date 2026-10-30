import { publicHomeSchema, type PublicExhibition, type PublicHome } from '@arthouz/shared'
import type { Metadata } from 'next'
import { AcrossTheWorld } from '@/components/home/AcrossTheWorld'
import { ArtistInFocus } from '@/components/home/ArtistInFocus'
import { ArtistsLine } from '@/components/home/ArtistsLine'
import { Galleries } from '@/components/home/Galleries'
import { HeroFullBleed } from '@/components/home/HeroFullBleed'
import { HeroSplit } from '@/components/home/HeroSplit'
import { InThePress } from '@/components/home/InThePress'
import { RecentExhibitions } from '@/components/home/RecentExhibitions'
import { UpcomingBand } from '@/components/home/UpcomingBand'
import { apiGet } from '@/lib/api'
import { loadSite } from '@/lib/site-metadata'
import { TAGS } from '@/lib/tags'

export async function generateMetadata(): Promise<Metadata> {
  const site = await loadSite()
  return { title: { absolute: site.title }, description: site.description }
}

function Hero({ exhibition, layout }: { exhibition: PublicExhibition | null; layout: PublicHome['heroLayout'] }) {
  if (!exhibition) return null
  return layout === 'SPLIT' ? <HeroSplit exhibition={exhibition} /> : <HeroFullBleed exhibition={exhibition} />
}

export default async function HomePage() {
  const home = await apiGet('/public/home', publicHomeSchema, [TAGS.home])
  return (
    <main>
      <Hero exhibition={home.hero} layout={home.heroLayout} />
      {home.upcoming && <UpcomingBand exhibition={home.upcoming} />}
      <RecentExhibitions exhibitions={home.recent} />
      <AcrossTheWorld exhibitions={home.world} />
      <ArtistInFocus focus={home.focus} />
      <ArtistsLine artists={home.artistsLine} />
      <Galleries locations={home.locations} />
      <InThePress news={home.news} />
    </main>
  )
}
