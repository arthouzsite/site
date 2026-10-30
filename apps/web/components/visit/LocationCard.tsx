import type { PublicLocation } from '@arthouz/shared'
import type { ReactNode } from 'react'
import { ImageSlot } from '@/components/site/ImageSlot'
import { PrimaryButton } from '@/components/site/PrimaryButton'
import { telHref } from '@/lib/format'

const IMAGE_SIZES = '(min-width: 1024px) 50vw, 100vw'

function Row({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-x-6 gap-y-[6px] border-t border-line-18 py-4 ${last ? 'border-b' : ''}`}>
      <dt className="flex-[0_0_96px] pt-[3px] text-[11.5px] tracking-[0.18em] text-muted uppercase">{label}</dt>
      <dd className="m-0 flex-[1_1_240px] text-[16px] leading-[1.5]">{children}</dd>
    </div>
  )
}

/** One gallery location: image, city, address/hours/call list and the Directions button. */
export function LocationCard({ location: l }: { location: PublicLocation }) {
  return (
    <article className="flex flex-col gap-6">
      <ImageSlot image={l.image} ratio="4/3" sizes={IMAGE_SIZES} placeholder={`Art Houz ${l.city}`} className="w-full" />
      <h2 className="m-0 font-display text-[clamp(44px,5vw,76px)] leading-none font-normal">{l.city}</h2>
      <dl className="m-0 flex flex-col">
        <Row label="Address">{l.address}</Row>
        <Row label="Hours">
          {l.days}, {l.hours}
        </Row>
        <Row label="Call" last>
          {l.tel ? (
            <a href={telHref(l.tel)} className="hit-44">
              {l.phone}
            </a>
          ) : (
            l.phone
          )}
        </Row>
      </dl>
      <PrimaryButton href={l.mapUrl} external>
        Directions ↗
      </PrimaryButton>
    </article>
  )
}
