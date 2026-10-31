'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const DEBOUNCE_MS = 150

export function ArtistSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [value, setValue] = useState(initialQuery)
  const lastPushed = useRef(initialQuery)

  useEffect(() => {
    if (initialQuery === lastPushed.current) return
    lastPushed.current = initialQuery
    setValue(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    if (value === lastPushed.current) return
    const timer = setTimeout(() => {
      lastPushed.current = value
      const trimmed = value.trim()
      router.replace(trimmed ? `${pathname}?q=${encodeURIComponent(trimmed)}` : pathname, { scroll: false })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [value, pathname, router])

  return (
    <input
      type="search"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder="Search artists"
      aria-label="Search artists"
      className="h-12 min-w-0 flex-[0_1_360px] border-0 border-b border-ink bg-transparent px-[2px] font-ui text-[16px] text-ink outline-none [&::-webkit-search-cancel-button]:appearance-none"
    />
  )
}
