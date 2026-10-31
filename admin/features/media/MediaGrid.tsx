/* eslint-disable @next/next/no-img-element -- Uploaded media are served from the bucket at stored sizes; next/image has nothing to optimise in the CMS. */
import { useRef, type KeyboardEvent } from 'react'
import { cx } from '../../components/ui/cx'
import { formatBytes } from '../../lib/format'
import { fileName, type Media } from './types'

type Props = {
  items: Media[]
  selectedId: string | null
  onSelect: (media: Media) => void
  label?: string
  columns?: string
}

export function MediaGrid({ items, selectedId, onSelect, label = 'Media library', columns = 'grid-cols-[repeat(auto-fill,minmax(160px,1fr))]' }: Props) {
  const refs = useRef<(HTMLLIElement | null)[]>([])
  const tabStop = items.some((m) => m.id === selectedId) ? selectedId : items[0]?.id

  const onKeyDown = (e: KeyboardEvent, index: number, media: Media) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(media)
      return
    }
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    refs.current[Math.min(items.length - 1, Math.max(0, index + step))]?.focus()
  }

  return (
    <ul role="listbox" aria-label={label} className={cx('m-0 grid list-none gap-3.5 p-0', columns)}>
      {items.map((m, i) => {
        const selected = m.id === selectedId
        return (
          <li
            key={m.id}
            ref={(el) => { refs.current[i] = el }}
            role="option"
            aria-selected={selected}
            tabIndex={m.id === tabStop ? 0 : -1}
            onClick={() => onSelect(m)}
            onKeyDown={(e) => onKeyDown(e, i, m)}
            className={cx(
              'flex min-h-11 cursor-pointer flex-col border bg-surface-2 hover:border-line-strong focus-visible:shadow-focus',
              selected ? 'border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'border-line',
            )}
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-img-ph">
              {m.kind === 'VIDEO' ? (
                <>
                  <video src={m.url} muted preload="metadata" playsInline aria-label={m.alt} className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 bg-ink px-1.5 py-0.5 text-11 uppercase tracking-eyebrow text-paper">Video</span>
                </>
              ) : (
                <img src={m.thumbUrl} alt={m.alt} width={m.width} height={m.height} loading="lazy" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex flex-col gap-0.5 px-2.5 py-2">
              <span className="truncate text-13 text-ink">{fileName(m)}</span>
              {m.alt ? (
                <span className="flex gap-2.5 text-12 text-muted">
                  {m.kind !== 'VIDEO' && <span>{m.width}×{m.height}</span>}
                  <span>{formatBytes(m.bytes)}</span>
                </span>
              ) : (
                <span className="text-12 text-danger">No alt text</span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
