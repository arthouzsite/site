import { STATUS_BADGE, type ExhibitionStatus } from '@/lib/shared'

type Props = { status: ExhibitionStatus; className?: string }

// Token equivalents of STATUS_BADGE's bg / fg / line colours (no colour literals outside tokens.css).
const BADGE_CLASSES: Record<ExhibitionStatus, string> = {
  CURRENT: 'border-amber bg-amber text-ink',
  UPCOMING: 'border-ink bg-ink text-paper',
  PAST: 'border-line-30 bg-transparent text-muted',
}

export function StatusBadge({ status, className = '' }: Props) {
  return (
    <span className={`border px-[10px] py-[5px] text-[11px] tracking-[0.16em] whitespace-nowrap uppercase ${BADGE_CLASSES[status]} ${className}`}>
      {STATUS_BADGE[status].label}
    </span>
  )
}
