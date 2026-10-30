'use client'

const SCROLL_OFFSET_PX = 96

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function jumpTo(letter: string): void {
  const target = document.getElementById(`L-${letter}`)
  if (!target) return
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET_PX, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

export function LetterStrip({ letters }: { letters: string[] }) {
  return (
    <nav aria-label="Artists A to Z" className="mb-6 flex flex-wrap gap-1 border-t border-ink pt-[14px]">
      {letters.map((letter) => (
        <button
          key={letter}
          type="button"
          onClick={() => jumpTo(letter)}
          className="relative h-9 w-9 cursor-pointer border-none bg-transparent font-display text-[22px] text-ink hover:text-rust before:absolute before:-inset-1 before:content-['']"
        >
          {letter}
        </button>
      ))}
    </nav>
  )
}
