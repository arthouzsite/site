import type { PublicArtistDetail } from '@/lib/shared'
import { SectionRule } from '@/components/site/SectionRule'
import { WorkCards } from '@/components/works/WorkCards'

const WORK_IMAGE_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw'
const MIN_COLUMN_PX = 280

type Props = { artist: { slug: string; name: string }; works: PublicArtistDetail['works'] }

export function SelectedWorks({ artist, works }: Props) {
  if (works.length === 0) return null
  return (
    <section>
      <SectionRule title="Selected works" className="mt-[clamp(56px,7vw,100px)] mb-8" />
      <WorkCards
        title={artist.name}
        ratio="1/1"
        sizes={WORK_IMAGE_SIZES}
        minColumn={MIN_COLUMN_PX}
        columns="fill"
        works={works.map((work) => ({
          id: work.id,
          title: work.title,
          image: work.image,
          artist,
          caption: (
            <>
              <i className="font-display text-[19px] text-ink">{work.title}</i>, {work.year}
              <br />
              <span className="text-muted">
                {work.medium} · {work.size}
              </span>
            </>
          ),
        }))}
      />
    </section>
  )
}
