import { publicAboutSchema } from '@arthouz/shared'
import type { Metadata } from 'next'
import { AboutTabs } from '@/components/about/AboutTabs'
import { parseAboutTab } from '@/components/about/tabs'
import { Container } from '@/components/site/Container'
import { apiGet } from '@/lib/api'
import { TAGS } from '@/lib/tags'

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
        <h1 className="m-0 mb-10 font-display text-[clamp(56px,9vw,148px)] leading-[0.9] font-normal tracking-[-0.02em]">About</h1>
        <AboutTabs about={about} tab={tab} />
      </Container>
    </main>
  )
}
