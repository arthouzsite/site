import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'> & {
  tone: 'ink' | 'paper'
  children: ReactNode
}

const TONES = {
  ink: 'border-ink text-ink',
  paper: 'border-paper text-paper',
} as const

/** The prototype's 40 px outlined uppercase control (Menu / Close); hit area padded to 44 px. */
export function OutlineButton({ tone, children, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={`hit-44 h-10 cursor-pointer border border-solid bg-transparent px-4 py-0 font-ui text-[12px] tracking-[0.16em] uppercase ${TONES[tone]}`}
    >
      {children}
    </button>
  )
}
