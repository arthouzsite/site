import type { PublicExhibitionDetail } from '@/lib/shared'
import { SectionRule } from '@/components/site/SectionRule'

export function PressList({ press }: { press: PublicExhibitionDetail['press'] }) {
  return (
    <section>
      <SectionRule as="h2" title="Press" className="mb-2" />
      {press.map((item) => (
        <article key={item.slug} className="flex flex-wrap gap-x-12 gap-y-3 border-b border-line-14 py-7">
          <h3 className="m-0 flex-[1_1_380px] font-display-tamil text-[26px] leading-[1.15] font-normal text-balance">{item.title}</h3>
          <p className="m-0 flex-[1_1_380px] text-[14.5px] leading-[1.6] text-muted text-pretty">{item.excerpt}</p>
        </article>
      ))}
    </section>
  )
}
