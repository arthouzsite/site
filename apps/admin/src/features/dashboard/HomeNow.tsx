import { Link } from 'react-router'
import { Card } from '../../components/ui/Card'
import { useSettings } from '../settings/useSettings'
import type { useDashboard } from './useDashboard'

type Dash = ReturnType<typeof useDashboard>
const LAYOUT_LABEL: Record<string, string> = { FULL_BLEED: 'Full-bleed', SPLIT: 'Split' }

function Row({ label, value, change }: { label: string; value: string; change: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-2.5 text-13">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 flex items-center gap-3 text-right">
        <span>{value}</span>
        <Link to="/settings" aria-label={change} className="inline-flex min-h-11 items-center text-12 underline hover:text-rust">Change</Link>
      </dd>
    </div>
  )
}

export function HomeNow({ dash }: { dash: Dash }) {
  const settings = useSettings()
  const home = dash.home.data
  const isAuto = settings.data?.homeHeroExhibitionId === null
  const hero = home?.hero ? `${home.hero.title}${isAuto ? ' (auto)' : ''}` : 'None'
  return (
    <Card title="On the home page now">
      {dash.home.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load the home page.</p>}
      {home && (
        <dl className="m-0 flex flex-col">
          <Row label="Hero" value={hero} change="Change hero" />
          <Row label="Hero layout" value={LAYOUT_LABEL[home.heroLayout] ?? home.heroLayout} change="Change hero layout" />
          <Row label="Upcoming band" value={home.upcoming?.title ?? 'None'} change="Change upcoming band" />
          <Row label="Artist in focus" value={home.focus.artist?.name ?? 'None'} change="Change artist in focus" />
          <Row label="Artists line" value={`${home.artistsLine.length} artists`} change="Change artists line" />
        </dl>
      )}
    </Card>
  )
}
