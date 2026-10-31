import type { ComponentProps } from 'react'
import { cx } from './cx'

export type ButtonVariant = 'primary' | 'default' | 'ghost' | 'danger' | 'onDark' | 'onDarkGhost'
type Props = ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: 'md' | 'sm'
  /** Square button holding only an icon; `aria-label` is then required. */
  iconOnly?: boolean
}

const VARIANT: Record<ButtonVariant, string> = {
  default: 'border-ink bg-transparent text-ink hover:bg-ink hover:text-paper',
  primary: 'border-ink bg-ink text-paper hover:bg-amber hover:border-amber hover:text-ink',
  ghost: 'border-transparent bg-transparent text-muted hover:bg-hover-ink hover:text-ink',
  danger: 'border-danger bg-transparent text-danger hover:bg-danger hover:text-white',
  // For ink surfaces (bulk bar, image-slot scrim): paper outline, inverting on hover.
  onDark: 'border-paper bg-transparent text-paper hover:bg-paper hover:text-ink',
  onDarkGhost: 'border-transparent bg-transparent text-on-dark-muted hover:bg-hover-dark hover:text-paper',
}

export function Button({ variant = 'default', size = 'md', iconOnly, className, type = 'button', ...rest }: Props) {
  // 44px hit area is guaranteed through min sizes; the small size keeps its look via padding.
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2.5 border uppercase tracking-eyebrow whitespace-nowrap rounded-xs transition-colors disabled:opacity-45',
        size === 'md' ? 'h-11 text-12' : 'h-11 text-11 md:h-8',
        iconOnly ? (size === 'md' ? 'w-11 px-0' : 'w-11 px-0 md:w-8') : size === 'md' ? 'px-[18px]' : 'px-3',
        VARIANT[variant],
        className,
      )}
      {...rest}
    />
  )
}
