import { useQuery } from '@tanstack/react-query'
import type { PublicHome } from '@arthouz/shared'
import { api } from '../../lib/api'

export type Thumb = { thumbUrl: string } | null
export type DashExhibition = {
  id: string
  title: string
  startDate: string
  endDate: string
  isPublished: boolean
  status: 'current' | 'upcoming' | 'past'
  updatedAt: string
  heroImage: Thumb
}
type ArtistRow = { id: string; name: string; isPublished: boolean; updatedAt: string; portraitImage: Thumb }
type NewsRow = { id: string; title: string; isPublished: boolean; updatedAt: string; image: Thumb }

export type RecentItem = {
  key: string
  kind: 'Exhibition' | 'Artist' | 'News'
  title: string
  href: string
  updatedAt: string
  thumbUrl: string | null
  status: 'current' | 'upcoming' | 'past' | 'draft' | 'live'
}

const RECENT_LIMIT = 6
const LIST_LIMIT = 5
const DRAFT_LIMIT = 50

type Listing<T> = { items: T[]; total: number }

async function listing<T>(path: string): Promise<Listing<T>> {
  const { data, meta } = await api.getWithMeta<T[]>(path)
  return { items: data, total: meta?.total ?? data.length }
}

function recentFrom(ex: DashExhibition[], artists: ArtistRow[], news: NewsRow[]): RecentItem[] {
  const items: RecentItem[] = [
    ...ex.map((e): RecentItem => ({
      key: `ex-${e.id}`, kind: 'Exhibition', title: e.title, href: `/exhibitions/${e.id}`, updatedAt: e.updatedAt,
      thumbUrl: e.heroImage?.thumbUrl ?? null, status: e.isPublished ? e.status : 'draft',
    })),
    ...artists.map((a): RecentItem => ({
      key: `ar-${a.id}`, kind: 'Artist', title: a.name, href: `/artists/${a.id}`, updatedAt: a.updatedAt,
      thumbUrl: a.portraitImage?.thumbUrl ?? null, status: a.isPublished ? 'live' : 'draft',
    })),
    ...news.map((n): RecentItem => ({
      key: `nw-${n.id}`, kind: 'News', title: n.title, href: `/news/${n.id}`, updatedAt: n.updatedAt,
      thumbUrl: n.image?.thumbUrl ?? null, status: n.isPublished ? 'live' : 'draft',
    })),
  ]
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, RECENT_LIMIT)
}

export function useDashboard() {
  const current = useQuery({ queryKey: ['dashboard', 'current'], queryFn: () => listing<DashExhibition>(`/exhibitions?status=current&limit=${LIST_LIMIT}`) })
  const upcoming = useQuery({ queryKey: ['dashboard', 'upcoming'], queryFn: () => listing<DashExhibition>(`/exhibitions?status=upcoming&limit=${LIST_LIMIT}`) })
  const drafts = useQuery({ queryKey: ['dashboard', 'drafts'], queryFn: () => listing<DashExhibition>(`/exhibitions?published=false&limit=${DRAFT_LIMIT}`) })
  const missingAlt = useQuery({ queryKey: ['dashboard', 'missingAlt'], queryFn: async () => (await listing<unknown>('/media?missingAlt=true&limit=1')).total })
  const home = useQuery({ queryKey: ['dashboard', 'home'], queryFn: () => api.get<PublicHome>('/public/home') })
  const recent = useQuery({
    queryKey: ['dashboard', 'recent'],
    queryFn: async () => {
      const [ex, artists, news] = await Promise.all([
        api.get<DashExhibition[]>(`/exhibitions?limit=${RECENT_LIMIT}`),
        api.get<ArtistRow[]>(`/artists?limit=${RECENT_LIMIT}`),
        api.get<NewsRow[]>(`/news?limit=${RECENT_LIMIT}`),
      ])
      return recentFrom(ex, artists, news)
    },
  })
  return { current, upcoming, drafts, missingAlt, home, recent }
}
