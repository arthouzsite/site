import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PrintGrid } from '@/components/prints/PrintGrid'
import { BackLink } from '@/components/site/BackLink'
import { Container } from '@/components/site/Container'
import { Eyebrow } from '@/components/site/Eyebrow'
import { PageTitle } from '@/components/site/PageTitle'
import { ApiError } from '@/lib/api'
import { getPrint } from '@/lib/prints'
import { detailMetadata } from '@/lib/site-metadata'

type Props = { params: Promise<{ slug: string }> }

const NOT_FOUND_STATUS = 404

async function loadCategory(slug: string) {
  try {
    return await getPrint(slug)
  } catch (error) {
    if (error instanceof ApiError && error.status === NOT_FOUND_STATUS) notFound()
    throw error
  }
}

const countLabel = (count: number) => `${count} ${count === 1 ? 'print' : 'prints'}`

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await loadCategory((await params).slug)
  return detailMetadata({ title: `${category.name} prints`, description: `${category.name}: ${countLabel(category.images.length)} at Art Houz.`, image: category.images[0] ?? null })
}

export default async function PrintCategoryPage({ params }: Props) {
  const category = await loadCategory((await params).slug)
  return (
    <main>
      <Container className="pt-[clamp(28px,4vw,48px)] pb-[clamp(32px,4vw,56px)]">
        <BackLink href="/prints">Prints</BackLink>
        <Eyebrow className="mt-10">{countLabel(category.images.length)}</Eyebrow>
        <PageTitle variant="detail" className="mt-4 max-w-[1200px]">{category.name}</PageTitle>
      </Container>
      <Container className="pb-[clamp(72px,9vw,140px)]">
        <PrintGrid slug={category.slug} title={category.name} images={category.images} />
      </Container>
    </main>
  )
}
