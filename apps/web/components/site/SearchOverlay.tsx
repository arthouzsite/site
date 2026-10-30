'use client'

import { useRef, useState } from 'react'
import { useModalDialog } from '@/hooks/useModalDialog'
import { useSiteSearch } from '@/hooks/useSiteSearch'
import { OutlineButton } from './OutlineButton'
import { SearchResults } from './SearchResults'

type Props = { onClose: () => void; returnFocus?: HTMLElement | null }

const PLACEHOLDER = 'Search artists, exhibitions, news'

/** Full-screen paper search overlay (prototype `searchOpen` block): Close, display-size input, grouped results. */
export function SearchOverlay({ onClose, returnFocus }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const result = useSiteSearch(query)
  useModalDialog(panel, onClose, returnFocus)

  return (
    <div ref={panel} role="dialog" aria-modal="true" aria-label="Search" className="fixed inset-0 z-100 overflow-auto bg-paper font-ui">
      <div className="mx-auto max-w-[1100px] px-[clamp(20px,4vw,56px)] pt-6 pb-16">
        <div className="mb-6 flex justify-end">
          <OutlineButton tone="ink" onClick={onClose}>
            Close
          </OutlineButton>
        </div>
        <div role="search">
          <input
            type="text"
            data-autofocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={PLACEHOLDER}
            placeholder={PLACEHOLDER}
            autoComplete="off"
            enterKeyHint="search"
            className="w-full border-0 border-b border-solid border-ink bg-transparent px-0 pt-2 pb-4 font-display text-[clamp(32px,5vw,64px)] text-ink outline-none"
          />
        </div>
        {result && <SearchResults result={result} onNavigate={onClose} />}
      </div>
    </div>
  )
}
