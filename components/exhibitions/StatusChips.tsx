'use client'

import type { ExhibitionParams, ExhibitionStatusParam } from '@/lib/searchParams'
import { useFilterNavigation } from './FilterChips'

const CHIPS: ReadonlyArray<{ value: ExhibitionStatusParam | undefined; label: string }> = [
  { value: undefined, label: 'All' },
  { value: 'current', label: 'Now on view' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
]

export function StatusChips({ current }: { current: ExhibitionParams }) {
  const navigate = useFilterNavigation(current)
  return (
    <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
      {CHIPS.map(({ value, label }) => {
        const active = current.status === value
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            onClick={() => navigate({ status: value })}
            className={`relative h-10 font-ui cursor-pointer border border-ink px-[18px] text-[12.5px] tracking-[0.14em] whitespace-nowrap uppercase before:absolute before:inset-x-0 before:-inset-y-[3px] before:content-[''] ${active ? 'bg-ink text-paper' : 'bg-transparent text-ink'}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
