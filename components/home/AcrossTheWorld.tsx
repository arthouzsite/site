import type { PublicExhibition } from '@/lib/shared'
import Link from 'next/link'
import { Container } from '@/components/site/Container'

type Props = { exhibitions: readonly PublicExhibition[] }

const HEADING_ID = 'home-world-title'

/** Exhibitions outside India as hairline-separated rows: location, title, dates, status. */
export function AcrossTheWorld({ exhibitions }: Props) {
  return (
    <section aria-labelledby={HEADING_ID}>
      <Container className="pb-[clamp(72px,9vw,140px)]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-6 border-t border-ink pt-[18px]">
          <h2 id={HEADING_ID} className="m-0 text-[12.5px] font-medium tracking-[0.18em] uppercase">
            Across the world
          </h2>
          <div className="text-[13px] text-muted">Exhibitions and fairs with partner galleries</div>
        </div>
        <p className="m-0 mb-10 max-w-[1080px] font-display text-[clamp(30px,4vw,56px)] leading-[1.1] text-balance">
          From Chennai and Bengaluru to Singapore, Dubai and London.
        </p>
        <ul className="m-0 flex list-none flex-col p-0">
          {exhibitions.map((exhibition) => (
            <li key={exhibition.id}>
              <Link
                href={`/exhibitions/${exhibition.slug}`}
                className="flex flex-wrap items-baseline gap-x-8 gap-y-2 border-t border-line-16 py-[22px] text-ink hover:text-rust"
              >
                <span className="flex-[0_0_200px] text-[12px] tracking-[0.18em] text-rust uppercase">
                  {exhibition.city}, {exhibition.country}
                </span>
                <span className="flex-[1_1_320px] font-display text-[clamp(24px,2.4vw,34px)] leading-[1.1]">{exhibition.title}</span>
                <span className="flex-[0_1_260px] text-[14px] text-muted">{exhibition.datesLabel}</span>
                <span className="flex-[0_0_110px] text-right text-[12px] tracking-[0.16em] uppercase">{exhibition.statusLabel}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
