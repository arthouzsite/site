import type { PublicExhibition } from '@arthouz/shared'
import Link from 'next/link'
import { ImageSlot } from '@/components/site/ImageSlot'
import { StatusBadge } from '@/components/site/StatusBadge'
import { TextLink } from '@/components/site/TextLink'

export function ExhibitionRow({ exhibition: e }: { exhibition: PublicExhibition }) {
  const href = `/exhibitions/${e.slug}`
  return (
    <article className="flex flex-wrap gap-x-[clamp(28px,4vw,72px)] gap-y-7 border-t border-line-18 py-10">
      <Link href={href} aria-label={e.title} className="relative block min-w-0 flex-[1_1_420px] bg-imgph" style={{ aspectRatio: '3/2' }}>
        <ImageSlot image={e.image} fill sizes="(min-width: 1024px) 50vw, 100vw" placeholder={e.title} />
      </Link>
      <div className="flex min-w-0 flex-[1_1_340px] flex-col justify-center gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[12px] tracking-[0.18em] whitespace-nowrap text-rust uppercase">
            {e.city}, {e.country}
          </span>
          <StatusBadge status={e.status} />
        </div>
        <h2 className="m-0 font-display text-[clamp(32px,3.6vw,54px)] leading-[1.02] font-normal text-balance">
          <Link href={href} className="text-ink hover:text-rust">
            {e.title}
          </Link>
        </h2>
        <div className="font-display text-[22px] text-body italic">{e.subtitle}</div>
        <div className="text-[14.5px] leading-[1.5] text-body">{e.artistLine}</div>
        <div className="text-[14px] text-muted">
          {e.datesLabel} · {e.venue}
        </div>
        <TextLink href={href} underline className="mt-[6px] self-start">
          View exhibition →
        </TextLink>
      </div>
    </article>
  )
}
