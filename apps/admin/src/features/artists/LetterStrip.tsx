import { cx } from '../../components/ui/cx'

const LETTERS = [...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)), '#']

type Props = { value: string; onChange: (letter: string) => void }

/** A–Z plus # jump strip. Pressing the active letter clears the filter. */
export function LetterStrip({ value, onChange }: Props) {
  return (
    <nav aria-label="Jump to letter" className="flex flex-wrap gap-1 border-t border-line-strong pt-3">
      {LETTERS.map((letter) => {
        const active = letter === value
        return (
          <button
            key={letter}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? '' : letter)}
            className={cx(
              'relative h-9 w-9 border bg-transparent font-display text-[20px] leading-none transition-colors after:absolute after:-inset-1 after:content-[""] hover:border-line-strong',
              active ? 'border-amber text-rust' : 'border-transparent text-ink',
            )}
          >
            {letter}
          </button>
        )
      })}
    </nav>
  )
}
