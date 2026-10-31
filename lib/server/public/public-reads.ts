import type {
  PublicAbout, PublicArtistDetail, PublicArtistList, PublicExhibitionDetail, PublicExhibitionList, PublicFair,
  PublicHome, PublicLocation, PublicNews, PublicSearch, PublicService, PublicSettings,
} from '@/lib/shared'
import { today } from '@/lib/server/clock'
import { buildHome } from './home.service'
import type { PublicExhibitionsQuery, PublicQ } from './public.queries'
import * as pages from './public.service'
import { search } from './search.service'

/**
 * Every public read as an in-process loader returning the exact `data` of its `/api/public/*` route,
 * so server components call these without an HTTP hop and the routes stay thin.
 */
export const publicReads = {
  getHome: (): Promise<PublicHome> => buildHome(today()),
  getAbout: (): Promise<PublicAbout> => pages.getAbout(),
  getSettings: (): Promise<PublicSettings> => pages.getSiteSettings(),
  getLocations: (): Promise<PublicLocation[]> => pages.listLocations(),
  getExhibitions: (query: PublicExhibitionsQuery = {}): Promise<PublicExhibitionList> => pages.listExhibitions(query),
  getExhibition: (slug: string): Promise<PublicExhibitionDetail> => pages.getExhibition(slug),
  getArtists: (query: Partial<PublicQ> = {}): Promise<PublicArtistList> => pages.listArtists(query.q ?? ''),
  getArtist: (slug: string): Promise<PublicArtistDetail> => pages.getArtist(slug),
  getFairs: (): Promise<PublicFair[]> => pages.listFairs(),
  getNews: (): Promise<PublicNews[]> => pages.listNews(),
  getServices: (): Promise<PublicService[]> => pages.listServices(),
  getService: (slug: string): Promise<PublicService> => pages.getService(slug),
  search: (q: string): Promise<PublicSearch> => search(q),
} as const
