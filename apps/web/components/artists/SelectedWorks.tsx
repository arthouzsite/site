import type { PublicArtistDetail } from '@arthouz/shared'
import { ImageSlot } from '@/components/site/ImageSlot'
import { SectionRule } from '@/components/site/SectionRule'

const WORK_IMAGE_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw'

export function SelectedWorks({ works }: { works: PublicArtistDetail['works'] }) {
  return (
    <section>
      <SectionRule title="Selected works" className="mt-[clamp(56px,7vw,100px)] mb-8" />
      <div className="grid gap-x-[clamp(16px,2vw,28px)] gap-y-10" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,280px),1fr))' }}>
        {works.map((work) => (
          <figure key={work.id} className="m-0 flex flex-col gap-3">
            <ImageSlot image={work.image} ratio="1/1" sizes={WORK_IMAGE_SIZES} placeholder="Artwork" />
            <figcaption className="text-[14px] leading-[1.5] text-body">
              <i className="font-display text-[19px] text-ink">{work.title}</i>, {work.year}
              <br />
              <span className="text-muted">
                {work.medium} · {work.size}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
