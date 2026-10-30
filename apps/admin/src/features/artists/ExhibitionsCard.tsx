import { Link } from 'react-router'
import { StatusChip } from '../../components/ui'
import type { ChipStatus } from '../../components/ui/StatusChip'
import { formatDate } from '../../lib/format'
import { SectionCard } from './SectionCard'
import type { AdminArtist, ArtistExhibition } from './types'
import { useArtistExhibitions } from './useArtists'

const STATUS: Record<ArtistExhibition['status'], ChipStatus> = { CURRENT: 'current', UPCOMING: 'upcoming', PAST: 'past' }

function dates(e: ArtistExhibition): string | null {
  if (!e.startDate || !e.endDate) return null
  return `${formatDate(e.startDate)} – ${formatDate(e.endDate)}`
}

export function ExhibitionsCard({ artist }: { artist: AdminArtist }) {
  const exhibitions = useArtistExhibitions(artist.id)
  const rows = exhibitions.data ?? []
  return (
    <SectionCard title="Exhibitions with Art Houz" note="Managed from each exhibition">
      {exhibitions.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load exhibitions.</p>}
      {exhibitions.data && rows.length === 0 && <p className="m-0 text-13 text-muted">No exhibitions yet.</p>}
      {rows.length > 0 && (
        <ul aria-label="Exhibitions" className="m-0 list-none border-t border-line p-0">
          {rows.map((e) => (
            <li key={e.id} className="flex min-h-row items-center gap-3.5 border-b border-line py-2">
              <div className="min-w-0 flex-1">
                <Link to={`/exhibitions/${e.id}`} className="font-display text-17 leading-tight hover:text-rust">{e.title}</Link>
                <div className="text-12 text-muted">{[e.city, dates(e)].filter(Boolean).join(' · ')}</div>
              </div>
              <StatusChip status={STATUS[e.status]} />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
