import type { MouseEvent } from 'react'
import { SearchIcon } from './SearchIcon'

type Props = { variant: 'desktop' | 'mobile'; onClick: (event: MouseEvent<HTMLElement>) => void }

const VARIANTS = {
  desktop: { className: 'hit-44 flex p-[6px]', icon: 18 },
  mobile: { className: 'flex h-11 w-11 items-center justify-center', icon: 20 },
} as const

export function SearchButton({ variant, onClick }: Props) {
  const { className, icon } = VARIANTS[variant]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Search"
      aria-haspopup="dialog"
      className={`cursor-pointer border-none bg-transparent text-ink ${className}`}
    >
      <SearchIcon size={icon} />
    </button>
  )
}
