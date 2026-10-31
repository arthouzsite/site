import type { PublicService } from '@/lib/shared'
import { ImageSlot } from '@/components/site/ImageSlot'
import { TextLink } from '@/components/site/TextLink'

const IMAGE_SIZES = '(min-width: 1024px) 45vw, 100vw'

type Props = { service: PublicService; /** Odd rows put the image on the right from 1024 px. */ flipped: boolean }

/** One service on the index: 3:2 image beside title, summary and a read-more link (the About Services rhythm). */
export function ServiceRow({ service, flipped }: Props) {
  return (
    <article
      className={`flex flex-wrap gap-x-[clamp(32px,6vw,120px)] gap-y-10 border-t border-line-18 py-[clamp(32px,4vw,56px)] ${flipped ? 'min-[1024px]:flex-row-reverse' : ''}`}
    >
      <ImageSlot image={service.image} ratio="3/2" sizes={IMAGE_SIZES} placeholder={service.title} className="min-w-0 flex-[1_1_440px]" />
      <div className="flex min-w-0 flex-[1_1_380px] flex-col justify-center gap-6">
        <h2 className="m-0 font-display text-[clamp(34px,3.8vw,58px)] leading-[1.02] font-normal">{service.title}</h2>
        {service.summary && <p className="m-0 max-w-[560px] text-[17px] leading-[1.7] text-pretty text-body">{service.summary}</p>}
        <TextLink href={`/services/${encodeURIComponent(service.slug)}`}>
          Read more<span className="sr-only">{` about ${service.title}`}</span> <span aria-hidden="true">→</span>
        </TextLink>
      </div>
    </article>
  )
}
