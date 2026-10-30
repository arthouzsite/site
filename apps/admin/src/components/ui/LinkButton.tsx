import { Link, type LinkProps } from 'react-router'
import { cx } from './cx'

type Props = LinkProps & { variant?: 'primary' | 'default' }

const VARIANT = {
  default: 'border-ink text-ink hover:bg-ink hover:text-paper',
  primary: 'border-ink bg-ink text-paper hover:border-amber hover:bg-amber hover:text-ink',
}

/** A router link styled as a Button. */
export function LinkButton({ variant = 'default', className, ...rest }: Props) {
  return (
    <Link
      className={cx('inline-flex h-11 items-center justify-center gap-2.5 whitespace-nowrap rounded-xs border px-[18px] text-12 uppercase tracking-eyebrow transition-colors', VARIANT[variant], className)}
      {...rest}
    />
  )
}
