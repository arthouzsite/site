'use client'

import { usePathname, useRouter } from 'next/navigation'
import { buildExhibitionQuery, type ExhibitionParams } from '@/lib/searchParams'

/** Writes the next filter state to the URL without scrolling; shared by both chip rows. */
export function useFilterNavigation(current: ExhibitionParams): (next: ExhibitionParams) => void {
  const router = useRouter()
  const pathname = usePathname()
  return (next) => router.replace(`${pathname}${buildExhibitionQuery({ ...current, ...next })}`, { scroll: false })
}
