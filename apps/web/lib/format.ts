import type { PublicExhibition } from '@arthouz/shared'

const TEL_SCHEME = /^tel:/i
const CURRENT_HERO_LABEL = 'Now on view'

/** `href` for a phone link. The admin stores `+91…`, the seed `tel:+91…`; either yields exactly one `tel:` prefix. */
export function telHref(value: string): string {
  let number = value.trim()
  while (TEL_SCHEME.test(number)) number = number.replace(TEL_SCHEME, '').trim()
  return `tel:${number}`
}

/** Home hero eyebrow: the fixed phrase while the show is on, otherwise the API's own label (e.g. "Opening 3 Dec"). */
export function heroStatusLabel(exhibition: Pick<PublicExhibition, 'status' | 'statusLabel'>): string {
  return exhibition.status === 'CURRENT' ? CURRENT_HERO_LABEL : exhibition.statusLabel
}
