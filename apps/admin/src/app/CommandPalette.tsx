import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { Dialog, Icon, StatusChip } from '../components/ui'
import { useDebouncedValue } from '../features/media/useDebouncedValue'
import { SEARCH_MIN_CHARS, useRecordSearch, type SearchGroup, type SearchHit } from './useRecordSearch'

const SEARCH_DEBOUNCE_MS = 200

type Props = { open: boolean; onClose: () => void }

export function CommandPalette({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="Search records" hideTitle placement="top" width="w-[min(640px,calc(100vw-32px))]">
      <Palette onClose={onClose} />
    </Dialog>
  )
}

const wrap = (index: number, length: number) => (index + length) % length

function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const listId = useId()
  const [input, setInput] = useState('')
  const [active, setActive] = useState(0)
  const term = input.trim()
  const debounced = useDebouncedValue(term, SEARCH_DEBOUNCE_MS)
  const groups = useRecordSearch(debounced)
  const hits = groups.flatMap((g) => g.hits)
  const hitCount = hits.length

  // A new result set starts at its first row.
  useEffect(() => setActive(0), [debounced, hitCount])

  const searching = debounced.length >= SEARCH_MIN_CHARS
  const settled = searching && debounced === term && groups.every((g) => !g.isPending)
  const failed = groups.filter((g) => g.isError)
  const optionId = (hit: SearchHit) => `${listId}-${hit.to.replaceAll('/', '-')}`

  const open = (hit: SearchHit | undefined) => {
    if (!hit) return
    navigate(hit.to)
    onClose()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (hitCount > 0 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setActive((i) => wrap(i + (e.key === 'ArrowDown' ? 1 : -1), hitCount))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      open(hits[active])
    }
  }

  const activeHit = hits[active]
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <label htmlFor={`${listId}-input`} className="sr-only">Search records</label>
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id={`${listId}-input`}
          role="combobox"
          aria-expanded={hitCount > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeHit ? optionId(activeHit) : undefined}
          autoComplete="off"
          spellCheck={false}
          data-autofocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          className="h-11 w-full rounded-xs border border-line-strong bg-surface-2 pl-9 pr-3 text-14 text-ink placeholder:text-faint hover:border-ink focus:border-ink"
        />
      </div>
      {failed.length > 0 && (
        <p role="alert" className="m-0 flex items-center gap-1.5 text-12 text-danger">
          <Icon name="alert" />
          Could not search {failed.map((g) => g.label).join(', ')}.
        </p>
      )}
      <div id={listId} role="listbox" aria-label="Results" className="flex flex-col gap-3 empty:hidden">
        {groups.filter((g) => g.hits.length > 0).map((g) => (
          <ResultGroup key={g.key} group={g} listId={listId} activeHit={activeHit} optionId={optionId} onSelect={open} onHover={(hit) => setActive(hits.indexOf(hit))} />
        ))}
      </div>
      {settled && hitCount === 0 && failed.length === 0 && <p className="m-0 py-2 text-13 text-muted">Nothing found for “{term}”</p>}
    </div>
  )
}

type GroupProps = {
  group: SearchGroup
  listId: string
  activeHit: SearchHit | undefined
  optionId: (hit: SearchHit) => string
  onSelect: (hit: SearchHit) => void
  onHover: (hit: SearchHit) => void
}

function ResultGroup({ group, listId, activeHit, optionId, onSelect, onHover }: GroupProps) {
  const headingId = `${listId}-${group.key}`
  return (
    <div role="group" aria-labelledby={headingId} className="flex flex-col">
      <div id={headingId} className="px-3 pb-1 text-11 uppercase tracking-eyebrow text-muted">{group.label}</div>
      {group.hits.map((hit) => {
        const isActive = hit === activeHit
        return (
          // Options are driven from the search box (aria-activedescendant), so they are pointer targets only.
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <div
            key={hit.id}
            id={optionId(hit)}
            role="option"
            tabIndex={-1}
            aria-selected={isActive}
            onClick={() => onSelect(hit)}
            onMouseMove={() => !isActive && onHover(hit)}
            className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 border-l-2 px-3 text-14 text-ink ${isActive ? 'border-amber bg-hover-ink' : 'border-transparent'}`}
          >
            <span className="min-w-0 truncate">{hit.title}</span>
            <span className="flex shrink-0 gap-1.5">
              {hit.chips.map((c) => <StatusChip key={c.label} status={c.status} label={c.label} />)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
