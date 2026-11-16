import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FairGallery } from '@/components/fairs/FairGallery'
import { BackLink } from '@/components/site/BackLink'
import { Container } from '@/components/site/Container'
import { Eyebrow } from '@/components/site/Eyebrow'
import { ImageSlot } from '@/components/site/ImageSlot'
import { PageTitle } from '@/components/site/PageTitle'
import { ApiError } from '@/lib/api'
import { getFair } from '@/lib/fairs'
import { paragraphs } from '@/lib/format'
import { detailMetadata } from '@/lib/site-metadata'

type Props = { params: Promise<{ slug: string }> }

const NOT_FOUND_STATUS = 404
const IMAGE_SIZES = '(min-width: 1024px) 45vw, 100vw'

async function loadFair(slug: string) {
  try {
    return await getFair(slug)
  } catch (error) {
    if (error instanceof ApiError && error.status === NOT_FOUND_STATUS) notFound()
    throw error
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fair = await loadFair((await params).slug)
  return detailMetadata({ title: fair.title, description: paragraphs(fair.text)[0] || fair.where || fair.title, image: fair.image ?? fair.gallery[0] ?? null })
}

export default async function FairPage({ params }: Props) {
  const fair = await loadFair((await params).slug)
  return (
    <main>
      <Container className="pt-[clamp(28px,4vw,48px)] pb-[clamp(32px,4vw,56px)]">
        <BackLink href="/fairs">Fairs</BackLink>
        <Eyebrow className="mt-10">{fair.where}</Eyebrow>
        <PageTitle variant="detail" className="mt-4 max-w-[1200px]">{fair.title}</PageTitle>
      </Container>
      <Container className="flex flex-wrap gap-x-[clamp(32px,6vw,120px)] gap-y-10 pb-[clamp(48px,6vw,96px)]">
        <ImageSlot image={fair.image} ratio="3/2" sizes={IMAGE_SIZES} priority placeholder={fair.title} className="min-w-0 flex-[1_1_440px]" />
        <div className="flex min-w-0 flex-[1_1_380px] flex-col justify-center gap-6">
          {fair.booth && <div className="text-[14px] text-muted">{fair.booth}</div>}
          {paragraphs(fair.text).map((paragraph, index) => (
            <p key={index} className="m-0 max-w-[560px] text-[17px] leading-[1.7] text-pretty text-body">
              {paragraph}
            </p>
          ))}
        </div>
      </Container>
      <Container className="pb-[clamp(72px,9vw,140px)]">
        <FairGallery images={fair.gallery} title={fair.title} />
      </Container>
    </main>
  )
}
