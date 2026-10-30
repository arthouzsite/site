'use client'

import type { PublicSearch } from '@arthouz/shared'
import { useEffect, useState } from 'react'

export const SEARCH_DEBOUNCE_MS = 200

export type SearchGroup = PublicSearch['groups'][number]
export type SearchResult = { readonly query: string; readonly groups: readonly SearchGroup[]; readonly failed: boolean }

const GROUP_LABELS: ReadonlySet<string> = new Set(['Artists', 'Exhibitions', 'News', 'Services'])

/** Same-origin paths only: a result must never become a `javascript:` or off-site link. */
function isInternalHref(href: unknown): href is string {
  return typeof href === 'string' && href.startsWith('/') && !href.startsWith('//')
}

function isItem(value: unknown): value is SearchGroup['items'][number] {
  const item = value as { label?: unknown; href?: unknown } | null
  return typeof item?.label === 'string' && isInternalHref(item.href)
}

/** Narrows the `/api/search` body to `{ groups }` without shipping zod to the client. */
function parseGroups(body: unknown): SearchGroup[] {
  const groups = (body as { groups?: unknown } | null)?.groups
  if (!Array.isArray(groups)) throw new Error('search response has no groups array')
  return groups.flatMap((group: { label?: unknown; items?: unknown }) => {
    if (typeof group?.label !== 'string' || !GROUP_LABELS.has(group.label) || !Array.isArray(group.items)) return []
    const items = group.items.filter(isItem)
    return items.length > 0 ? [{ label: group.label as SearchGroup['label'], items }] : []
  })
}

async function fetchGroups(q: string, signal: AbortSignal): Promise<SearchGroup[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal })
  if (!response.ok) throw new Error(`search failed with HTTP ${response.status}`)
  return parseGroups(await response.json())
}

/**
 * Debounced site search: queries `/api/search` `delay` ms after the last change, aborting any request
 * still in flight. Returns the latest settled result, or null while the query is blank.
 */
export function useSiteSearch(query: string, delay = SEARCH_DEBOUNCE_MS): SearchResult | null {
  const [result, setResult] = useState<SearchResult | null>(null)
  const q = query.trim()
  const [previousQ, setPreviousQ] = useState(q)
  // Blanking the query drops the last result, so it cannot flash back while the next query is debounced.
  if (q !== previousQ) {
    setPreviousQ(q)
    if (!q) setResult(null)
  }

  useEffect(() => {
    if (!q) return undefined
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetchGroups(q, controller.signal)
        .then((groups) => {
          if (controller.signal.aborted) return
          setResult({ query: q, groups, failed: false })
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          console.error('[web] search failed', error)
          setResult({ query: q, groups: [], failed: true })
        })
    }, delay)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q, delay])

  return q ? result : null
}
