import { publicArtistDetailSchema, type PublicArtistDetail } from '@arthouz/shared'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArtistExhibitions } from '@/components/artists/ArtistExhibitions'
import { SelectedWorks } from '@/components/artists/SelectedWorks'
import { Container } from '@/components/site/Container'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ImageSlot } from '@/components/site/ImageSlot'
import { PrimaryButton } from '@/components/site/PrimaryButton'
import { ApiError, apiGet } from '@/lib/api'
import { detailMetadata } from '@/lib/site-metadata'
import { TAGS } from '@/lib/tags'

type Props = { params: Promise<{ slug: string }> }

const NOT_FOUND_STATUS = 404

async function loadArtist(slug: string): Promise<PublicArtistDetail> {
  try {
    return await apiGet(`/public/artists/${encodeURIComponent(slug)}`, publicArtistDetailSchema, [TAGS.artists, TAGS.artist(slug)])
  } catch (error) {
    if (error instanceof ApiError && error.status === NOT_FOUND_STATUS) notFound()
    throw error
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artist = await loadArtist((await params).slug)
  return detailMetadata({ title: artist.name, description: artist.lede, image: artist.image })
}

export default async function ArtistPage({ params }: Props) {
  const a = await loadArtist((await params).slug)
  return (
    <main>
      <Container className="pt-[clamp(28px,4vw,48px)] pb-[clamp(72px,9vw,140px)]">
        <Link href="/artists" className="hit-44 text-[12.5px] tracking-[0.16em] text-muted uppercase">
          <span aria-hidden="true">←</span> Artists
        </Link>
        <Eyebrow className="mt-10 mb-4">
          {a.medium} · Lives and works in {a.base}
        </Eyebrow>
        <h1 className="m-0 mb-[clamp(36px,5vw,64px)] font-display text-[clamp(52px,8.4vw,136px)] leading-[0.92] font-normal tracking-[-0.02em] text-balance">{a.name}</h1>
        <div className="flex flex-wrap gap-x-[clamp(32px,6vw,120px)] gap-y-10">
          <div className="relative min-w-[min(100%,280px)] flex-[0_1_480px]" style={{ aspectRatio: '4/5' }}>
            <ImageSlot image={a.image} fill priority sizes="(min-width: 1024px) 480px, 100vw" placeholder="Portrait or studio image" />
          </div>
          <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-7">
            <p className="m-0 font-display text-[clamp(24px,2.4vw,32px)] leading-[1.3] text-pretty">{a.lede}</p>
            <p className="m-0 max-w-[620px] text-[16px] leading-[1.7] text-body text-pretty">{a.bio}</p>
            {a.exhibitions.length > 0 && <ArtistExhibitions exhibitions={a.exhibitions} />}
            <PrimaryButton href="/visit">Enquire about works →</PrimaryButton>
          </div>
        </div>
        <SelectedWorks works={a.works} />
      </Container>
    </main>
  )
}
