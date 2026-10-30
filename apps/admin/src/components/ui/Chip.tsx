import type { ReactNode } from 'react'
import { cx } from './cx'

export const CHIP_BASE =
  'inline-flex h-6 items-center gap-1.5 border border-transparent px-[9px] text-11 uppercase tracking-eyebrow whitespace-nowrap'

export function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cx(CHIP_BASE, 'bg-hover-ink text-body', className)}>{children}</span>
}
