'use client'

import type { ExhibitionParams } from '@/lib/searchParams'
import { useFilterNavigation } from './FilterChips'

type Props = { cities: string[]; current: ExhibitionParams }

export function CityChips({ cities, current }: Props) {
  const navigate = useFilterNavigation(current)
  const chips = [{ value: undefined, label: 'All locations' }, ...cities.map((city) => ({ value: city, label: city }))]
  return (
    <div role="group" aria-label="Filter by location" className="flex flex-wrap gap-x-5 gap-y-1">
      {chips.map(({ value, label }) => {
        const active = current.city === value
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            onClick={() => navigate({ city: value })}
            className={`relative h-10 font-ui cursor-pointer border-0 border-b bg-transparent p-0 text-[13px] tracking-[0.08em] whitespace-nowrap before:absolute before:-inset-x-1 before:-inset-y-[2px] before:content-[''] ${active ? 'border-amber text-ink' : 'border-transparent text-muted'}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
