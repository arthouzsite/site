import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  tone?: 'rust' | 'amber' | 'muted'
  /** Leading 8 px amber dot ("Now on view"). */
  dot?: boolean
  className?: string
}

const TONES = {
  rust: 'text-[12px] text-rust',
  amber: 'text-[12px] text-amber',
  muted: 'text-[11.5px] text-muted',
} as const

/** Small uppercase label above a heading or block (0.18em tracking). */
export function Eyebrow({ children, tone = 'rust', dot = false, className = '' }: Props) {
  const layout = dot ? 'flex items-center gap-[10px]' : ''
  return (
    <div className={`tracking-[0.18em] uppercase ${TONES[tone]} ${layout} ${className}`}>
      {dot && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber" />}
      {children}
    </div>
  )
}
