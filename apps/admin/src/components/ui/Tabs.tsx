import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from './cx'

export type TabItem = { id: string; label: string; /** Shows a dot, announced as "(unsaved changes)". */ unsaved?: boolean }
type Props = {
  tabs: TabItem[]
  value: string
  onChange: (id: string) => void
  label: string
  children?: ReactNode
}

export function tabId(id: string): string {
  return `tab-${id}`
}
export function panelId(id: string): string {
  return `panel-${id}`
}

export function Tabs({ tabs, value, onChange, label, children }: Props) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const onKeyDown = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === value)
    const last = tabs.length - 1
    const next =
      e.key === 'ArrowRight' ? (i + 1) % tabs.length
      : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : -1
    if (next < 0) return
    e.preventDefault()
    const target = tabs[next]!
    onChange(target.id)
    refs.current[target.id]?.focus()
  }

  return (
    <div>
      {/* Arrow-key handling lives on the tablist; focus sits on the selected tab (roving tabindex). */}
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus */}
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex flex-wrap gap-x-6 border-b border-line">
        {tabs.map((t) => {
          const selected = t.id === value
          return (
            <button
              key={t.id}
              ref={(el) => { refs.current[t.id] = el }}
              role="tab"
              id={tabId(t.id)}
              type="button"
              aria-selected={selected}
              aria-controls={panelId(t.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(t.id)}
              className={cx(
                '-mb-px h-11 border-0 border-b-2 bg-transparent p-0 text-12 uppercase tracking-eyebrow hover:text-ink',
                selected ? 'border-amber text-ink' : 'border-transparent text-muted',
              )}
            >
              {t.label}
              {t.unsaved && (
                <>
                  <span aria-hidden="true" className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber align-middle" />
                  {' '}
                  <span className="sr-only">(unsaved changes)</span>
                </>
              )}
            </button>
          )
        })}
      </div>
      {children}
    </div>
  )
}
