import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatDayMonth } from './dates'
import type { useDashboard } from './useDashboard'

type Dash = ReturnType<typeof useDashboard>

const TILE = 'flex min-h-[120px] flex-col gap-2.5 border border-line bg-surface px-5 py-[18px]'

function Big({ value, note }: { value: ReactNode; note?: string }) {
  return (
    <span className="font-display text-40 leading-none">
      {value}
      {note && <small className="ml-2 font-ui text-13 text-muted">{note}</small>}
    </span>
  )
}

function LinkTile({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <Link to="/exhibitions" className={`${TILE} hover:border-ink`}>
      <span className="text-11 uppercase tracking-eyebrow text-muted">{label}</span>
      <Big value={value} note={note} />
    </Link>
  )
}

export function DashboardTiles({ dash }: { dash: Dash }) {
  const now = dash.current.data
  const next = dash.upcoming.data
  const nowFirst = now?.items[0]
  const nextFirst = next?.items[0]
  const missing = dash.missingAlt.data
  return (
    <section aria-label="Overview" className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
      <LinkTile label="Now on view" value={now?.total ?? '–'} note={nowFirst ? `${nowFirst.title} · ends ${formatDayMonth(nowFirst.endDate)}` : undefined} />
      <LinkTile label="Upcoming" value={next?.total ?? '–'} note={nextFirst ? `${nextFirst.title} · ${formatDayMonth(nextFirst.startDate)}` : undefined} />
      <LinkTile label="Drafts" value={dash.drafts.data?.total ?? '–'} note="awaiting publish" />
      <div className={TILE}>
        <span className="text-11 uppercase tracking-eyebrow text-muted">Media without alt text</span>
        <Big value={missing ?? '–'} />
        <Link to="/media?missingAlt=true" className="inline-flex min-h-11 items-center self-start text-13 underline hover:text-rust">Add alt text in Media</Link>
      </div>
    </section>
  )
}
