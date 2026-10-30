import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from './cx'

export type RadioCardOption = { value: string; name: string; preview?: ReactNode }
type Props = { label: string; options: RadioCardOption[]; value: string; onChange: (value: string) => void }

export function RadioCards({ label, options, value, onChange }: Props) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const onKeyDown = (e: KeyboardEvent) => {
    const i = options.findIndex((o) => o.value === value)
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const target = options[(i + step + options.length) % options.length]!
    onChange(target.value)
    refs.current[target.value]?.focus()
  }

  return (
    // Arrow-key handling lives on the group; focus sits on the checked radio inside it (roving tabindex).
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
      {options.map((o) => {
        const checked = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[o.value] = el }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cx(
              'flex min-h-11 flex-col gap-2.5 rounded-xs border bg-surface-2 p-3 text-left transition-colors',
              checked ? 'border-amber shadow-[inset_0_0_0_1px_var(--color-amber)]' : 'border-line-strong hover:border-ink',
            )}
          >
            {o.preview && <span className="relative block h-[72px] overflow-hidden border border-line bg-paper">{o.preview}</span>}
            <span className="text-13 font-medium">{o.name}</span>
          </button>
        )
      })}
    </div>
  )
}
