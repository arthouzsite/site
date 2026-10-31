import { publicExhibitionDetailSchema, type PublicExhibitionDetail } from '@/lib/shared'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArtistPills } from '@/components/exhibitions/ArtistPills'
import { ExhibitionMeta } from '@/components/exhibitions/ExhibitionMeta'
import { PressList } from '@/components/exhibitions/PressList'
import { WorksGrid } from '@/components/exhibitions/WorksGrid'
import { Container } from '@/components/site/Container'
import { ImageSlot } from '@/components/site/ImageSlot'
import { StatusBadge } from '@/components/site/StatusBadge'
import { ApiError, apiGet } from '@/lib/api'
import { detailMetadata } from '@/lib/site-metadata'
import { TAGS } from '@/lib/tags'

type Props = { params: Promise<{ slug: string }> }

const NOT_FOUND_STATUS = 404
const TYPE_LABELS = { SOLO: 'Solo', GROUP: 'Group' } as const

async function loadExhibition(slug: string): Promise<PublicExhibitionDetail> {
  try {
    return await apiGet(`/public/exhibitions/${encodeURIComponent(slug)}`, publicExhibitionDetailSchema, [TAGS.exhibitions, TAGS.exhibition(slug)])
  } catch (error) {
    if (error instanceof ApiError && error.status === NOT_FOUND_STATUS) notFound()
    throw error
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const exhibition = await loadExhibition((await params).slug)
  return detailMetadata({ title: exhibition.title, description: exhibition.blurb, image: exhibition.image })
}

export default async function ExhibitionPage({ params }: Props) {
  const e = await loadExhibition((await params).slug)
  return (
    <main>
      <Container className="pt-[clamp(28px,4vw,48px)] pb-[clamp(32px,4vw,56px)]">
        <Link href="/exhibitions" className="hit-44 text-[12.5px] tracking-[0.16em] text-muted uppercase">
          <span aria-hidden="true">←</span> Exhibitions
        </Link>
        <div className="mt-10 mb-[18px] flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[12px] tracking-[0.18em] text-rust uppercase">
            {e.city}, {e.country} · {TYPE_LABELS[e.type]}
          </span>
          <StatusBadge status={e.status} />
        </div>
        <h1 className="m-0 max-w-[1200px] font-display text-[clamp(44px,7vw,112px)] leading-[0.95] font-normal tracking-[-0.015em] text-balance">{e.title}</h1>
        <div className="mt-5 font-display text-[clamp(22px,2.2vw,30px)] text-body italic">{e.subtitle}</div>
      </Container>
      <div className="relative h-[clamp(360px,70vh,820px)] w-full bg-imgph">
        <ImageSlot image={e.image} fill priority sizes="max(100vw, 85vh)" placeholder={e.title} />
      </div>
      <Container className="flex flex-wrap gap-x-[clamp(32px,6vw,120px)] gap-y-10 py-[clamp(40px,5vw,72px)]">
        <ExhibitionMeta meta={e.meta} />
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-7">
          <p className="m-0 max-w-[820px] font-display text-[clamp(24px,2.4vw,34px)] leading-[1.3] text-pretty">{e.blurb}</p>
          <p className="m-0 max-w-[720px] text-[16px] leading-[1.7] text-body text-pretty">{e.body}</p>
          <ArtistPills artists={e.artists} />
        </div>
      </Container>
      <Container className="pb-[clamp(56px,7vw,100px)]">
        <WorksGrid works={e.works} />
      </Container>
      {e.press.length > 0 && (
        <Container className="pb-[clamp(72px,9vw,140px)]">
          <PressList press={e.press} />
        </Container>
      )}
    </main>
  )
}
