import type { PublicExhibition } from '@arthouz/shared'
import { Container } from '@/components/site/Container'
import { SectionRule } from '@/components/site/SectionRule'
import { TextLink } from '@/components/site/TextLink'
import { ExhibitionCard } from './ExhibitionCard'

type Props = { exhibitions: readonly PublicExhibition[] }

const HEADING_ID = 'home-recent-title'

export function RecentExhibitions({ exhibitions }: Props) {
  return (
    <section aria-labelledby={HEADING_ID}>
      <Container className="pb-[clamp(72px,9vw,140px)]">
        <SectionRule title={<span id={HEADING_ID}>Recent exhibitions</span>} action={<TextLink href="/exhibitions">All exhibitions →</TextLink>} />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-[clamp(20px,2.4vw,36px)] gap-y-12">
          {exhibitions.map((exhibition) => (
            <ExhibitionCard key={exhibition.id} exhibition={exhibition} />
          ))}
        </div>
      </Container>
    </section>
  )
}
