import type { ButtonHTMLAttributes, ReactNode } from 'react'

const TONES = {
  ink: 'border-ink bg-transparent text-ink',
  paper: 'border-paper bg-transparent text-paper',
  /** The filled partner of an ink button, for the main action beside it (Order beside Close). */
  solid: 'border-ink bg-ink text-paper hover:border-amber hover:bg-amber hover:text-ink',
  /** The filled partner of a paper button, for the main action over an image (Enquire beside View). */
  light: 'border-paper bg-paper text-ink hover:border-amber hover:bg-amber',
} as const

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'> & {
  tone: keyof typeof TONES
  children: ReactNode
}

/** The prototype's 40 px outlined uppercase control (Menu / Close); hit area padded to 44 px. */
export function OutlineButton({ tone, children, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={`hit-44 h-10 cursor-pointer border border-solid px-4 py-0 font-ui text-[12px] tracking-[0.16em] uppercase ${TONES[tone]}`}
    >
      {children}
    </button>
  )
}
