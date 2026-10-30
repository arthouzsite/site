import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { SectionCard } from './SectionCard'
import { ToggleCell } from './ToggleCell'
import type { AdminArtist } from './types'
import { useFeatureArtist, useFeaturedArtists, useHomeFocus, usePublishArtist } from './useArtists'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 border-b border-line text-13">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 text-right">{children}</dd>
    </div>
  )
}

type Props = { artist: AdminArtist | null; dirty: boolean }

/** Publish and feature are their own mutations, so they stay off while unsaved edits exist. */
export function VisibilityCard({ artist, dirty }: Props) {
  const publish = usePublishArtist()
  const feature = useFeatureArtist()
  const featured = useFeaturedArtists()
  const homeFocus = useHomeFocus()
  const locked = !artist || dirty || publish.isPending || feature.isPending
  const position = artist ? (featured.data?.findIndex((a) => a.id === artist.id) ?? -1) + 1 : 0
  const note = !artist ? 'Save the artist first' : null

  return (
    <>
      <SectionCard title="Visibility">
        <dl className="m-0 flex flex-col">
          <Row label="Published">
            <ToggleCell
              label="Published"
              checked={artist?.isPublished ?? false}
              disabled={locked}
              onChange={(e) => artist && publish.mutate({ id: artist.id, isPublished: e.target.checked })}
            />
          </Row>
          <Row label="Featured">
            <ToggleCell
              label="Featured"
              checked={artist?.isFeatured ?? false}
              disabled={locked}
              onChange={(e) => artist && feature.mutate({ id: artist.id, isFeatured: e.target.checked })}
            />
          </Row>
          {artist?.isFeatured && position > 0 && (
            <Row label="Featured order"><Link to="/artists" className="underline">{position} of {featured.data?.length ?? position}</Link></Row>
          )}
          {artist && <Row label="Last saved">{formatDate(artist.updatedAt)}</Row>}
        </dl>
        {note && <p className="m-0 text-12 text-muted">{note}</p>}
      </SectionCard>
      {artist && homeFocus.data?.artistId === artist.id && (
        <Link to="/settings" className="flex min-h-16 items-center gap-3.5 border border-line bg-surface px-5 py-3.5 transition-colors hover:border-ink">
          <span className="grid h-9 w-9 flex-none place-items-center bg-warn-bg text-rust"><Icon name="eye" /></span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-13 font-medium">Shown on home as artist in focus</span>
            <span className="text-12 text-muted">Change in Home &amp; settings</span>
          </span>
          <Icon name="external" />
        </Link>
      )}
    </>
  )
}
