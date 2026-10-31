import { notFound } from 'next/navigation'

/**
 * Catches every URL that matches no other route so it resolves inside the (site) layout: the branded 404 then
 * renders between the public header and footer. Static segments (/admin, /api) outrank this catch-all.
 */
export default function UnmatchedPage(): never {
  notFound()
}
