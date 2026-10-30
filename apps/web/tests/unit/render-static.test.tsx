import type { ImgHTMLAttributes } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/image', () => ({
  default: ({ alt, src }: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src as string} />
  ),
}))

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

import { GalleryTab } from '@/components/about/GalleryTab'
import { ProprietorTab } from '@/components/about/ProprietorTab'
import { PublicationsTab } from '@/components/about/PublicationsTab'
import { ServicesTab } from '@/components/about/ServicesTab'
import { ABOUT_TABS, DEFAULT_ABOUT_TAB, parseAboutTab } from '@/components/about/tabs'
import { ArtistExhibitions } from '@/components/artists/ArtistExhibitions'
import { FeaturedGrid } from '@/components/artists/FeaturedGrid'
import { FlowingIndex } from '@/components/artists/FlowingIndex'
import { GroupedIndex } from '@/components/artists/GroupedIndex'
import { SelectedWorks } from '@/components/artists/SelectedWorks'
import { ArtistPills } from '@/components/exhibitions/ArtistPills'
import { EmptyState } from '@/components/exhibitions/EmptyState'
import { ExhibitionMeta } from '@/components/exhibitions/ExhibitionMeta'
import { ExhibitionRow } from '@/components/exhibitions/ExhibitionRow'
import { PressList } from '@/components/exhibitions/PressList'
import { WorksGrid } from '@/components/exhibitions/WorksGrid'
import { FairRow } from '@/components/fairs/FairRow'
import { AcrossTheWorld } from '@/components/home/AcrossTheWorld'
import { ArtistInFocus } from '@/components/home/ArtistInFocus'
import { ArtistsLine } from '@/components/home/ArtistsLine'
import { ExhibitionCard } from '@/components/home/ExhibitionCard'
import { Galleries } from '@/components/home/Galleries'
import { HeroFullBleed } from '@/components/home/HeroFullBleed'
import { HeroSplit } from '@/components/home/HeroSplit'
import { InThePress } from '@/components/home/InThePress'
import { NewsCard } from '@/components/home/NewsCard'
import { RecentExhibitions } from '@/components/home/RecentExhibitions'
import { UpcomingBand } from '@/components/home/UpcomingBand'
import { Container } from '@/components/site/Container'
import { Eyebrow } from '@/components/site/Eyebrow'
import { FooterLocation } from '@/components/site/FooterLocation'
import { Header } from '@/components/site/Header'
import { PrimaryButton } from '@/components/site/PrimaryButton'
import { SectionRule } from '@/components/site/SectionRule'
import { StatusBadge } from '@/components/site/StatusBadge'
import { Wordmark } from '@/components/site/Wordmark'
import { LocationCard } from '@/components/visit/LocationCard'
import { TAGS } from '@/lib/tags'
import {
  about, artist, artistDetail, exhibition, exhibitionDetail, fair, home, image, location, news, pastExhibition, upcomingExhibition,
} from './support/publicFixtures'

const html = (node: React.ReactElement) => renderToStaticMarkup(node)

describe('about tabs', () => {
  it('renders the gallery statement, body and locations link', () => {
    const out = html(<GalleryTab gallery={about.gallery} />)
    expect(out).toContain('Statement.')
    expect(out).toContain('href="/visit"')
    expect(out).toContain('Our locations')
  })

  it('renders the proprietor name, quote and body', () => {
    const out = html(<ProprietorTab proprietor={about.proprietor} />)
    expect(out).toContain('A. Person')
    expect(out).toContain('<blockquote')
  })

  it('shows the publications link only when there is an external URL', () => {
    expect(html(<PublicationsTab publications={about.publications} />)).toContain('View more')
    expect(html(<PublicationsTab publications={{ ...about.publications, externalUrl: null }} />)).not.toContain('View more')
  })

  it('renders the services call to action', () => {
    expect(html(<ServicesTab services={about.services} />)).toContain('Enquire')
  })

  it('resolves tab keys and falls back to the gallery', () => {
    expect(ABOUT_TABS).toHaveLength(4)
    expect(parseAboutTab('services')).toBe('services')
    expect(parseAboutTab('nope')).toBe(DEFAULT_ABOUT_TAB)
    expect(parseAboutTab(null)).toBe(DEFAULT_ABOUT_TAB)
  })
})

describe('artist components', () => {
  it('links each exhibition an artist showed in', () => {
    expect(html(<ArtistExhibitions exhibitions={artistDetail.exhibitions} />)).toContain('href="/exhibitions/salt-line"')
  })

  it('renders the featured grid, flowing index and grouped index', () => {
    expect(html(<FeaturedGrid artists={[artist]} />)).toContain('/artists/parvathi-nayar')
    const flowing = html(<FlowingIndex artists={[artist, { ...artist, id: 'a2', slug: 'b', name: 'B' }]} />)
    expect(flowing).toContain('·')
    expect(html(<GroupedIndex groups={[{ letter: 'N', items: [artist] }]} />)).toContain('id="L-N"')
  })

  it('renders selected works with their captions', () => {
    expect(html(<SelectedWorks works={artistDetail.works} />)).toContain('30 x 40 cm')
  })
})

describe('exhibition components', () => {
  it('renders pills, meta, press, works and the empty state', () => {
    expect(html(<ArtistPills artists={exhibition.artists} />)).toContain('Parvathi Nayar')
    expect(html(<ExhibitionMeta meta={exhibitionDetail.meta} />)).toContain('Opening')
    expect(html(<PressList press={exhibitionDetail.press} />)).toContain('A review')
    expect(html(<WorksGrid works={exhibitionDetail.works} />)).toContain('Kolam')
    expect(html(<EmptyState />)).toContain('No exhibitions match')
  })

  it('renders a list row linking to the detail page', () => {
    const out = html(<ExhibitionRow exhibition={exhibition} />)
    expect(out).toContain('href="/exhibitions/salt-line"')
    expect(out).toContain('Chennai, India')
  })
})

describe('fairs, visit and home', () => {
  it('renders a fair and a location, with and without a phone link', () => {
    expect(html(<FairRow fair={fair} />)).toContain('India Art Fair')
    expect(html(<LocationCard location={location} />)).toContain('href="tel:+914400000000"')
    const plain = html(<LocationCard location={{ ...location, tel: null }} />)
    expect(plain).not.toContain('href="tel:')
    expect(plain).toContain('Directions')
  })

  it('renders both hero layouts and the upcoming band', () => {
    expect(html(<HeroSplit exhibition={exhibition} />)).toContain('Salt Line')
    expect(html(<HeroFullBleed exhibition={exhibition} />)).toContain('Salt Line')
    const noImage = html(<HeroFullBleed exhibition={{ ...exhibition, image: null }} />)
    expect(noImage).toContain('Salt Line')
    expect(noImage).not.toContain('<img')
    expect(noImage).toContain('aria-label="Exhibition image"')
    expect(html(<UpcomingBand exhibition={upcomingExhibition} />)).toContain('Tide Table')
  })

  it('renders the home sections', () => {
    expect(html(<ExhibitionCard exhibition={exhibition} />)).toContain('/exhibitions/salt-line')
    expect(html(<RecentExhibitions exhibitions={home.recent} />)).toContain('Old Show')
    expect(html(<AcrossTheWorld exhibitions={[pastExhibition]} />)).toContain('Singapore')
    expect(html(<ArtistInFocus focus={home.focus} />)).toContain('View artist')
    expect(html(<ArtistInFocus focus={{ ...home.focus, artist: null }} />)).not.toContain('View artist')
    expect(html(<ArtistsLine artists={home.artistsLine} />)).toContain('Parvathi Nayar')
    expect(html(<Galleries locations={home.locations} />)).toContain('Chennai')
    expect(html(<InThePress news={home.news} />)).toContain('In the press')
    expect(html(<NewsCard item={news} />)).toContain('Oct 2026')
    expect(html(<NewsCard item={{ ...news, externalUrl: null, exhibition: null }} />)).toContain('Oct 2026')
  })
})

describe('site chrome', () => {
  it('renders the layout primitives', () => {
    expect(html(<Container className="x">kid</Container>)).toContain('kid')
    expect(html(<Eyebrow dot tone="amber">Label</Eyebrow>)).toContain('Label')
    expect(html(<Eyebrow tone="muted">Muted</Eyebrow>)).toContain('Muted')
    expect(html(<SectionRule title="Title" action={<a href="/x">All</a>} as="h3" />)).toContain('<h3')
    expect(html(<Wordmark />)).toContain('ART HOUZ')
  })

  it('renders a status badge for every status', () => {
    const expected = {
      CURRENT: { label: 'Now on view', tone: 'bg-amber' },
      UPCOMING: { label: 'Upcoming', tone: 'bg-ink' },
      PAST: { label: 'Past', tone: 'bg-transparent' },
    } as const
    for (const status of ['CURRENT', 'UPCOMING', 'PAST'] as const) {
      const out = html(<StatusBadge status={status} />)
      expect(out).toContain(`>${expected[status].label}</span>`)
      expect(out).toContain(expected[status].tone)
    }
  })

  it('renders internal and external primary buttons', () => {
    expect(html(<PrimaryButton href="/visit">Go</PrimaryButton>)).not.toContain('target=')
    expect(html(<PrimaryButton href="https://x.example" external>Out</PrimaryButton>)).toContain('noopener noreferrer')
  })

  it('renders footer locations with and without a tel link', () => {
    expect(html(<FooterLocation location={location} />)).toContain('href="tel:+914400000000"')
    expect(html(<FooterLocation location={{ ...location, tel: null }} />)).not.toContain('href=')
  })

  it('renders the header with the home link', () => {
    expect(html(<Header />)).toContain('aria-label="Art Houz, home"')
  })
})

describe('cache tags', () => {
  it('builds per-slug tags', () => {
    expect(TAGS.exhibition('a')).toBe('exhibition:a')
    expect(TAGS.artist('b')).toBe('artist:b')
  })
})
