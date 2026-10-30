import { publicNewsSchema } from '@arthouz/shared'
import type { Metadata } from 'next'
import { z } from 'zod'
import { NewsArticle } from '@/components/news/NewsArticle'
import { Container } from '@/components/site/Container'
import { apiGet } from '@/lib/api'
import { TAGS } from '@/lib/tags'

export function generateMetadata(): Metadata {
  return { title: 'News' }
}

export default async function NewsPage() {
  const news = await apiGet('/public/news', z.array(publicNewsSchema), [TAGS.news])
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <h1 className="m-0 mb-14 font-display text-[clamp(56px,9vw,148px)] leading-[0.9] font-normal tracking-[-0.02em]">News</h1>
        {news.map((item) => (
          <NewsArticle key={item.id} item={item} />
        ))}
      </Container>
    </main>
  )
}
