import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'

type Item = { id: string; name?: string }
export type MoveDirection = 'up' | 'down'

type Props<T extends Item> = {
  label: string
  items: T[]
  onMove: (id: string, dir: MoveDirection) => void
  onRemove?: (id: string) => void
  renderItem: (item: T, index: number) => ReactNode
  getLabel?: (item: T) => string
}

export function OrderedList<T extends Item>({ label, items, onMove, onRemove, renderItem, getLabel }: Props<T>) {
  const [announcement, setAnnouncement] = useState('')
  const [moved, setMoved] = useState<{ id: string; dir: MoveDirection } | null>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const nameOf = (item: T) => getLabel?.(item) ?? item.name ?? item.id

  // Keep keyboard focus on the moved row's control; fall back to its sibling button at an end of the list.
  useEffect(() => {
    if (!moved) return
    const row = listRef.current?.querySelector<HTMLElement>(`[data-row="${CSS.escape(moved.id)}"]`)
    const preferred = row?.querySelector<HTMLButtonElement>(`[data-move="${moved.dir}"]`)
    const other = row?.querySelector<HTMLButtonElement>(`[data-move="${moved.dir === 'up' ? 'down' : 'up'}"]`)
    ;(preferred && !preferred.disabled ? preferred : other)?.focus()
  }, [items, moved])

  const move = (item: T, index: number, dir: MoveDirection) => {
    const target = dir === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= items.length) return
    onMove(item.id, dir)
    setMoved({ id: item.id, dir })
    setAnnouncement(`${nameOf(item)} moved to position ${target + 1} of ${items.length}`)
  }

  return (
    <div>
      <ol ref={listRef} aria-label={label} className="m-0 list-none border-t border-line p-0">
        {items.map((item, i) => (
          <li key={item.id} data-row={item.id} className="flex h-row items-center gap-3 border-b border-line pr-1">
            <span className="w-5 text-12 tabular-nums text-faint" aria-hidden="true">{i + 1}</span>
            <span data-name className="min-w-0 flex-1 truncate">{renderItem(item, i)}</span>
            <span className="flex gap-0.5">
              <Button variant="ghost" size="sm" iconOnly data-move="up" aria-label={`Move ${nameOf(item)} up`} disabled={i === 0} onClick={() => move(item, i, 'up')}>
                <Icon name="up" />
              </Button>
              <Button variant="ghost" size="sm" iconOnly data-move="down" aria-label={`Move ${nameOf(item)} down`} disabled={i === items.length - 1} onClick={() => move(item, i, 'down')}>
                <Icon name="down" />
              </Button>
              {onRemove && (
                <Button variant="ghost" size="sm" iconOnly aria-label={`Remove ${nameOf(item)}`} onClick={() => onRemove(item.id)}>
                  <Icon name="close" />
                </Button>
              )}
            </span>
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
    </div>
  )
}
