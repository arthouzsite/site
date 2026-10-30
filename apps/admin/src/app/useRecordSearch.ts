import { useQueries } from '@tanstack/react-query'
import type { ChipStatus } from '../components/ui/StatusChip'
import { api } from '../lib/api'
import type { AdminArtist } from '../features/artists/types'
import type { AdminExhibition } from '../features/exhibitions/types'
import { STATUS_TO_CHIP } from '../features/exhibitions/types'
import type { AdminFair } from '../features/fairs/types'
import type { AdminNews } from '../features/news/types'

export const SEARCH_MIN_CHARS = 2
export const SEARCH_LIMIT = 5

export type HitChip = { status: ChipStatus; label: string }
export type SearchHit = { id: string; title: string; to: string; chips: HitChip[] }
export type SearchGroup = { key: string; label: string; hits: SearchHit[]; isError: boolean; isPending: boolean }

const published = (isPublished: boolean): HitChip => (isPublished ? { status: 'live', label: 'Published' } : { status: 'draft', label: 'Draft' })
const matches = (term: string, ...fields: string[]) => fields.some((f) => f.toLowerCase().includes(term.toLowerCase()))

const exhibitionHit = (e: AdminExhibition): SearchHit => ({
  id: e.id,
  title: e.title,
  to: `/exhibitions/${e.id}`,
  chips: [{ status: STATUS_TO_CHIP[e.status], label: e.statusLabel }, ...(e.isPublished ? [] : [published(false)])],
})
const artistHit = (a: AdminArtist): SearchHit => ({ id: a.id, title: a.name, to: `/artists/${a.id}`, chips: [published(a.isPublished)] })
const newsHit = (n: AdminNews): SearchHit => ({ id: n.id, title: n.title, to: `/news/${n.id}`, chips: [published(n.isPublished)] })
const fairHit = (f: AdminFair): SearchHit => ({ id: f.id, title: f.title, to: `/fairs/${f.id}`, chips: [published(f.isPublished)] })

const searchPath = (path: string, term: string) => `${path}?${new URLSearchParams({ q: term, limit: String(SEARCH_LIMIT) })}`

/** Searches the four record types in parallel. `term` is already trimmed and debounced by the caller. */
export function useRecordSearch(term: string): SearchGroup[] {
  const enabled = term.length >= SEARCH_MIN_CHARS
  // The first three endpoints search server-side; the fairs endpoint takes no query, so its (small) list is filtered here.
  const results = useQueries({
    queries: [
      { queryKey: ['palette', 'exhibitions', term], queryFn: () => api.get<AdminExhibition[]>(searchPath('/exhibitions', term)), enabled, retry: false, select: (d: AdminExhibition[]) => d.map(exhibitionHit) },
      { queryKey: ['palette', 'artists', term], queryFn: () => api.get<AdminArtist[]>(searchPath('/artists', term)), enabled, retry: false, select: (d: AdminArtist[]) => d.map(artistHit) },
      { queryKey: ['palette', 'news', term], queryFn: () => api.get<AdminNews[]>(searchPath('/news', term)), enabled, retry: false, select: (d: AdminNews[]) => d.map(newsHit) },
      {
        queryKey: ['fairs'],
        queryFn: () => api.get<AdminFair[]>('/fairs'),
        enabled,
        retry: false,
        select: (d: AdminFair[]) => d.filter((f) => matches(term, f.title, f.venue, f.city)).slice(0, SEARCH_LIMIT).map(fairHit),
      },
    ],
  })
  const labels = [['exhibitions', 'Exhibitions'], ['artists', 'Artists'], ['news', 'News'], ['fairs', 'Fairs']] as const
  return results.map((r, i) => ({
    key: labels[i]![0],
    label: labels[i]![1],
    hits: enabled ? ((r.data as SearchHit[] | undefined) ?? []) : [],
    isError: enabled && r.isError,
    isPending: enabled && r.isPending,
  }))
}
