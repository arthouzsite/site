import { Button } from '../../components/ui'

type Props = { count: number; busy: boolean; onPublish: () => void; onUnpublish: () => void; onClear: () => void }

export function BulkBar({ count, busy, onPublish, onUnpublish, onClear }: Props) {
  return (
    <div role="region" aria-label="Bulk actions" className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-ink px-4 py-2 text-paper">
      <span className="text-13 font-medium whitespace-nowrap">{count} selected</span>
      <Button size="sm" variant="onDark" disabled={busy} onClick={onPublish}>Publish</Button>
      <Button size="sm" variant="onDark" disabled={busy} onClick={onUnpublish}>Unpublish</Button>
      <span className="flex-1" />
      <Button size="sm" variant="onDarkGhost" onClick={onClear}>Clear</Button>
    </div>
  )
}
