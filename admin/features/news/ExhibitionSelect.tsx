import { useId, useState } from 'react'
import { Button, Icon, Input } from '../../components/ui'
import { useDebouncedValue } from '../media/useDebouncedValue'
import { useExhibitionOptions, type ExhibitionOption } from './useNews'

const SEARCH_DEBOUNCE_MS = 250
type Props = {
  id?: string
  value: { id: string; title: string } | null
  onChange: (value: ExhibitionOption | null) => void
  'aria-describedby'?: string
}

/** Searchable single select over exhibitions: type to filter, pick from the listbox, clear with the chip. */
export function ExhibitionSelect({ id, value, onChange, 'aria-describedby': describedBy }: Props) {
  const listId = useId()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const q = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const options = useExhibitionOptions(q)

  const pick = (option: ExhibitionOption) => {
    onChange(option)
    setSearch('')
    setOpen(false)
  }

  return (
    <div className="relative flex flex-col gap-2">
      {value && (
        <span className="inline-flex items-center gap-1 self-start border border-line-strong bg-surface-2 py-0.5 pl-3 text-13 text-ink">
          {value.title}
          <Button variant="ghost" size="sm" iconOnly aria-label={`Remove linked exhibition ${value.title}`} onClick={() => onChange(null)}><Icon name="close" /></Button>
        </span>
      )}
      <Input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-describedby={describedBy}
        placeholder="Search exhibitions"
        autoComplete="off"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
        onBlur={(e) => { if (!e.relatedTarget?.closest(`[id="${CSS.escape(listId)}"]`)) setOpen(false) }}
      />
      {open && (
        <ul id={listId} role="listbox" aria-label="Exhibitions" className="absolute left-0 right-0 top-full z-20 m-0 max-h-64 list-none overflow-auto border border-line-strong bg-surface-2 p-0 shadow-toast">
          {(options.data ?? []).length === 0 && <li role="presentation" className="px-3 py-2.5 text-13 text-muted">No exhibitions match.</li>}
          {(options.data ?? []).map((o) => (
            <li key={o.id} role="presentation">
              <button type="button" role="option" aria-selected={o.id === value?.id} onClick={() => pick(o)}
                className="flex min-h-11 w-full items-center px-3 text-left text-13 text-ink hover:bg-row-hover focus:bg-row-hover aria-selected:font-medium">
                {o.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
