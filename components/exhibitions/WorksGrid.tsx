import type { PublicExhibitionDetail } from '@/lib/shared'
import { ImageSlot } from '@/components/site/ImageSlot'
import { SectionRule } from '@/components/site/SectionRule'

// object-cover on a 4/5 box over a 6:5 source needs 1.5x the box width, so sizes ask for more than the column.
const WORK_IMAGE_SIZES = '(min-width: 1024px) 45vw, (min-width: 640px) 70vw, 150vw'

export function WorksGrid({ works }: { works: PublicExhibitionDetail['works'] }) {
  if (works.length === 0) return null
  return (
    <section>
      <SectionRule as="h2" title="Works in the exhibition" className="mb-8" />
      <div className="grid gap-x-[clamp(16px,2vw,28px)] gap-y-10" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))' }}>
        {works.map((work) => (
          <figure key={work.id} className="m-0 flex flex-col gap-3">
            <ImageSlot image={work.image} ratio="4/5" sizes={WORK_IMAGE_SIZES} placeholder="Artwork" />
            <figcaption className="text-[14px] leading-[1.5] text-body">
              <i className="font-display text-[19px] text-ink">{work.title}</i>, {work.year}
              <br />
              <span className="text-muted">
                {work.artist} · {work.medium}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
