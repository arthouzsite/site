import type { PublicExhibitionDetail } from '@/lib/shared'
import { SectionRule } from '@/components/site/SectionRule'
import { WorkCards } from '@/components/works/WorkCards'

// object-cover on a 4/5 box over a 6:5 source needs 1.5x the box width, so sizes ask for more than the column.
const WORK_IMAGE_SIZES = '(min-width: 1024px) 45vw, (min-width: 640px) 70vw, 150vw'
const MIN_COLUMN_PX = 300

type Props = { title: string; works: PublicExhibitionDetail['works'] }

export function WorksGrid({ title, works }: Props) {
  if (works.length === 0) return null
  return (
    <section>
      <SectionRule as="h2" title="Works in the exhibition" className="mb-8" />
      <WorkCards
        title={title}
        ratio="4/5"
        sizes={WORK_IMAGE_SIZES}
        minColumn={MIN_COLUMN_PX}
        columns="fit"
        works={works.map((work) => ({
          id: work.id,
          title: work.title,
          image: work.image,
          artist: { slug: work.artistSlug, name: work.artist },
          caption: (
            <>
              <i className="font-display text-[19px] text-ink">{work.title}</i>, {work.year}
              <br />
              <span className="text-muted">
                {work.artist} · {work.medium}
              </span>
            </>
          ),
        }))}
      />
    </section>
  )
}
