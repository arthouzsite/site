import { publicNewsSchema } from '@/lib/shared'
import type { Metadata } from 'next'
import { z } from 'zod'
import { NewsArticle } from '@/components/news/NewsArticle'
import { Container } from '@/components/site/Container'
import { apiGet } from '@/lib/api'
import { TAGS } from '@/lib/tags'
import { PageIntro } from '@/components/site/PageIntro'
import { loadPageDescription } from '@/lib/page-descriptions'

export function generateMetadata(): Metadata {
  return { title: 'News' }
}

export default async function NewsPage() {
  const [news, description] = await Promise.all([
    apiGet('/public/news', z.array(publicNewsSchema), [TAGS.news]),
    loadPageDescription('news'),
  ])
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <PageIntro title="News" description={description} className="mb-14" />
        {news.map((item) => (
          <NewsArticle key={item.id} item={item} />
        ))}
      </Container>
    </main>
  )
}
