import { Link, type LinkProps } from 'react-router'
import { cx } from './cx'

type Props = LinkProps & { variant?: 'primary' | 'default' }

const VARIANT = {
  default: 'border-ink text-ink hover:bg-ink hover:text-paper',
  primary: 'border-ink bg-ink text-paper hover:bg-amber hover:border-amber hover:text-ink',
}

/** A router link that looks like a Button. */
export function LinkButton({ variant = 'default', className, ...rest }: Props) {
  return (
    <Link
      className={cx(
        'inline-flex h-11 items-center justify-center gap-2.5 rounded-xs border bg-transparent px-[18px] text-12 uppercase tracking-eyebrow whitespace-nowrap transition-colors',
        VARIANT[variant],
        className,
      )}
      {...rest}
    />
  )
}
