import { NotFoundBody } from '@/components/site/NotFoundBody'

/**
 * Unmatched URLs sit outside the (site) layout. The public header and footer are deliberately not rendered here:
 * a not-found boundary is part of the root layout's payload on every route, /admin included.
 */
export default function NotFound() {
  return <NotFoundBody />
}
