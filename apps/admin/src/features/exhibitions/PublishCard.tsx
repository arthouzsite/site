import type { ExhibitionStatus } from '@arthouz/shared'
import { Icon, StatusChip, Switch } from '../../components/ui'
import { formatDate } from '../../lib/format'
import { FormCard } from './FormCard'
import { exhibitionUrl, STATUS_TO_CHIP } from './types'

type Props = {
  status: ExhibitionStatus | null
  isPublished: boolean
  /** False while the exhibition has not been created yet. */
  isSaved: boolean
  dirty: boolean
  busy: boolean
  updatedAt: string | null
  slug: string | null
  onTogglePublished: (next: boolean) => void
}

export function PublishCard({ status, isPublished, isSaved, dirty, busy, updatedAt, slug, onTogglePublished }: Props) {
  return (
    <FormCard title="Publishing">
      <dl className="m-0 flex flex-col gap-3 text-13">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Status</dt>
          <dd className="m-0">{status ? <StatusChip status={STATUS_TO_CHIP[status]} /> : '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Last saved</dt>
          <dd className="m-0">{updatedAt ? formatDate(updatedAt) : 'Not saved yet'}</dd>
        </div>
        {slug && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Slug</dt>
            <dd className="m-0 min-w-0 truncate">{slug}</dd>
          </div>
        )}
      </dl>
      <div className="flex items-center justify-between gap-3">
        <Switch label="Published" checked={isPublished} disabled={!isSaved || dirty || busy} onChange={(e) => onTogglePublished(e.target.checked)} />
        {!isPublished && <StatusChip status="draft" />}
      </div>
      {isSaved && dirty && <p className="m-0 text-12 text-muted">Save first</p>}
      {!isSaved && <p className="m-0 text-12 text-muted">Save the exhibition to publish it.</p>}
      {slug && isSaved && (
        <a href={exhibitionUrl(slug)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 self-start text-13 underline-offset-2 hover:underline">
          View on site <Icon name="external" />
        </a>
      )}
    </FormCard>
  )
}
