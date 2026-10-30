import { CHIP_BASE } from './Chip'
import { cx } from './cx'

export type ChipStatus = 'current' | 'upcoming' | 'past' | 'draft' | 'live'

const STYLE: Record<ChipStatus, { label: string; cls: string }> = {
  current: { label: 'Now on view', cls: 'border-amber bg-amber text-ink' },
  upcoming: { label: 'Upcoming', cls: 'border-ink bg-ink text-paper' },
  past: { label: 'Past', cls: 'border-line-strong bg-transparent text-muted' },
  draft: { label: 'Draft', cls: 'border-dashed border-line-strong bg-transparent text-muted' },
  live: { label: 'Live', cls: 'bg-success-bg text-success' },
}

export function StatusChip({ status, label }: { status: ChipStatus; label?: string }) {
  const s = STYLE[status]
  return <span className={cx(CHIP_BASE, s.cls)}>{label ?? s.label}</span>
}
