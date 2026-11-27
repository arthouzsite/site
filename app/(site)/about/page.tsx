import { publicAboutSchema } from '@/lib/shared'
import type { Metadata } from 'next'
import { AboutTabs } from '@/components/about/AboutTabs'
import { parseAboutTab } from '@/components/about/tabs'
import { Container } from '@/components/site/Container'
import { apiGet } from '@/lib/api'
import { TAGS } from '@/lib/tags'
import { PageIntro } from '@/components/site/PageIntro'
import { loadPageDescription } from '@/lib/page-descriptions'

export function generateMetadata(): Metadata {
  return { title: 'About' }
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function AboutPage({ searchParams }: Props) {
  const raw = (await searchParams).tab
  const tab = parseAboutTab(typeof raw === 'string' ? raw : undefined)
  const [about, description] = await Promise.all([
    apiGet('/public/about', publicAboutSchema, [TAGS.about]),
    loadPageDescription('about'),
  ])
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <PageIntro title="About" description={description} className="mb-10" />
        <AboutTabs about={about} tab={tab} />
      </Container>
    </main>
  )
}
