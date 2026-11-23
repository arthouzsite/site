'use client'

import { useCallback, useEffect, useState } from 'react'

const STEP: Readonly<Record<string, 1 | -1>> = { ArrowRight: 1, ArrowLeft: -1 }

/** Wrapping index over `count` items, starting at `startIndex`, driven by buttons and the Left/Right arrow keys while mounted. */
export function useGalleryIndex(count: number, startIndex = 0) {
  const [index, setIndex] = useState(startIndex)
  const move = useCallback((step: 1 | -1) => setIndex((current) => (current + step + count) % count), [count])

  useEffect(() => {
    if (count < 2) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      const step = STEP[event.key]
      if (step === undefined || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      event.preventDefault()
      move(step)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [count, move])

  return { index, setIndex, next: () => move(1), prev: () => move(-1) }
}
