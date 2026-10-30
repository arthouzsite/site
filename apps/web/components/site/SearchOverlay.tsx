'use client'

import { useEscapeKey } from '@/hooks/useEscapeKey'
import { OutlineButton } from './OutlineButton'

type Props = { onClose: () => void }

/** Search overlay shell (Close + input). Results arrive with Task 16. */
export function SearchOverlay({ onClose }: Props) {
  useEscapeKey(onClose)

  return (
    <div role="dialog" aria-modal="true" aria-label="Search" className="fixed inset-0 z-100 overflow-auto bg-paper font-ui">
      <div className="mx-auto max-w-[1100px] px-[clamp(20px,4vw,56px)] pt-6 pb-16">
        <div className="mb-6 flex justify-end">
          <OutlineButton tone="ink" onClick={onClose}>
            Close
          </OutlineButton>
        </div>
        <input
          type="text"
          autoFocus
          aria-label="Search artists, exhibitions, news"
          placeholder="Search artists, exhibitions, news"
          className="w-full border-0 border-b border-solid border-ink bg-transparent px-0 pt-2 pb-4 font-display text-[clamp(32px,5vw,64px)] text-ink outline-none"
        />
      </div>
    </div>
  )
}
