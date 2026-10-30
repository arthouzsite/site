import { useState } from 'react'
import { Icon, OrderedList } from '../../components/ui'
import type { MoveDirection } from '../../components/ui/OrderedList'
import { useDebouncedValue } from '../media/useDebouncedValue'
import { FormCard } from './FormCard'
import type { ArtistLite } from './types'
import { useArtistSearch } from './useExhibitions'

const SEARCH_DEBOUNCE_MS = 250
const MAX_RESULTS = 8

type Props = { value: ArtistLite[]; onChange: (next: ArtistLite[]) => void }

function moved(list: ArtistLite[], id: string, dir: MoveDirection): ArtistLite[] {
  const from = list.findIndex((a) => a.id === id)
  const to = dir === 'up' ? from - 1 : from + 1
  if (from < 0 || to < 0 || to >= list.length) return list
  const next = [...list]
  next[from] = list[to]!
  next[to] = list[from]!
  return next
}

export function ArtistsPicker({ value, onChange }: Props) {
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const results = useArtistSearch(q)
  const chosen = new Set(value.map((a) => a.id))
  const matches = (q ? (results.data ?? []) : []).filter((a) => !chosen.has(a.id)).slice(0, MAX_RESULTS)

  const add = (artist: ArtistLite) => {
    onChange([...value, { id: artist.id, name: artist.name, medium: artist.medium }])
    setSearch('')
  }

  return (
    <FormCard title="Artists" count={value.length}>
      {value.length === 0 ? (
        <p className="m-0 text-13 text-muted">No artists yet. Search below to add one.</p>
      ) : (
        <OrderedList
          label="Artists in the exhibition"
          items={value}
          onMove={(id, dir) => onChange(moved(value, id, dir))}
          onRemove={(id) => onChange(value.filter((a) => a.id !== id))}
          renderItem={(a) => (
            <>
              {a.name}
              {a.medium && <span className="ml-3 text-12 text-muted">{a.medium}</span>}
            </>
          )}
        />
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="add-artist" className="text-12 font-medium tracking-label text-body">Add artist</label>
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="add-artist"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name"
            className="h-11 w-full rounded-xs border border-line-strong bg-surface-2 pl-9 pr-3 text-14 text-ink placeholder:text-faint hover:border-ink focus:border-ink"
          />
        </div>
        {q && results.isSuccess && matches.length === 0 && <p className="m-0 text-12 text-muted">No artists to add for “{q}”.</p>}
        {matches.length > 0 && (
          <ul className="m-0 flex list-none flex-col border border-line bg-surface-2 p-0">
            {matches.map((a) => (
              <li key={a.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  aria-label={`Add ${a.name}`}
                  onClick={() => add(a)}
                  className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-14 hover:bg-row-hover"
                >
                  <Icon name="plus" />
                  <span>{a.name}</span>
                  {a.medium && <span className="text-12 text-muted">{a.medium}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FormCard>
  )
}
