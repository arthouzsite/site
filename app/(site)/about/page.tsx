import { publicAboutSchema } from '@/lib/shared'
import type { Metadata } from 'next'
import { AboutTabs } from '@/components/about/AboutTabs'
import { parseAboutTab } from '@/components/about/tabs'
import { Container } from '@/components/site/Container'
import { apiGet } from '@/lib/api'
import { TAGS } from '@/lib/tags'
import { PageTitle } from '@/components/site/PageTitle'

export function generateMetadata(): Metadata {
  return { title: 'About' }
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function AboutPage({ searchParams }: Props) {
  const raw = (await searchParams).tab
  const tab = parseAboutTab(typeof raw === 'string' ? raw : undefined)
  const about = await apiGet('/public/about', publicAboutSchema, [TAGS.about])
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <PageTitle className="mb-10">About</PageTitle>
        <AboutTabs about={about} tab={tab} />
      </Container>
    </main>
  )
}
