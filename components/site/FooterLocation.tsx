import type { PublicLocation } from '@/lib/shared'
import { telHref } from '@/lib/format'

type Props = { location: PublicLocation }

export function FooterLocation({ location }: Props) {
  return (
    <div className="flex max-w-[220px] flex-col gap-2 text-[14px] leading-[1.55] text-ondark">
      <div className="text-[11.5px] tracking-[0.18em] text-amber uppercase">{location.city}</div>
      <div>
        {location.days}
        <br />
        {location.hours}
      </div>
      {location.tel ? (
        <a href={telHref(location.tel)} className="hit-44 text-paper hover:text-paper">
          {location.phone}
        </a>
      ) : (
        <span className="text-paper">{location.phone}</span>
      )}
    </div>
  )
}
