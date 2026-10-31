import type { PublicNews } from '@/lib/shared'
import { Container } from '@/components/site/Container'
import { SectionRule } from '@/components/site/SectionRule'
import { TextLink } from '@/components/site/TextLink'
import { NewsCard } from './NewsCard'

type Props = { news: readonly PublicNews[] }

const HEADING_ID = 'home-press-title'

export function InThePress({ news }: Props) {
  return (
    <section aria-labelledby={HEADING_ID}>
      <Container className="pb-[clamp(72px,9vw,140px)]">
        <SectionRule title={<span id={HEADING_ID}>In the press</span>} action={<TextLink href="/news">All news →</TextLink>} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-x-[clamp(24px,3vw,48px)] gap-y-10">
          {news.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      </Container>
    </section>
  )
}
