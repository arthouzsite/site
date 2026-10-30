import { DEFAULT_COPYRIGHT_FROM, type PublicLocation } from '@arthouz/shared'
import { getLocations, getSettings } from './site-data'

/** Static tagline used when settings cannot be loaded (also the default site description). */
export const SITE_TAGLINE = 'Contemporary art from South India. Chennai & Bengaluru, since 2012.'

export type FooterData = {
  readonly tagline: string
  readonly copyrightFrom: number
  readonly instagramUrl: string | null
  readonly facebookUrl: string | null
  readonly locations: readonly PublicLocation[]
  /** True when the API failed and the shell is rendering static defaults. */
  readonly degraded: boolean
}

const FALLBACK: FooterData = {
  tagline: SITE_TAGLINE,
  copyrightFrom: DEFAULT_COPYRIGHT_FROM,
  instagramUrl: null,
  facebookUrl: null,
  locations: [],
  degraded: true,
}

function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  return String(error)
}

/** Loads footer settings + locations; on any API/network failure logs and returns static defaults. */
export async function loadFooterData(): Promise<FooterData> {
  try {
    const [settings, locations] = await Promise.all([getSettings(), getLocations()])
    const { tagline, copyrightFrom, instagramUrl, facebookUrl } = settings.footer
    return {
      tagline: tagline || SITE_TAGLINE,
      copyrightFrom,
      instagramUrl: instagramUrl || null,
      facebookUrl: facebookUrl || null,
      locations,
      degraded: false,
    }
  } catch (error) {
    console.error(`[web] footer data unavailable, rendering fallback shell: ${describe(error)}`)
    return FALLBACK
  }
}
