import Link from 'next/link'
import { loadNavPrints } from '@/lib/prints'
import { loadNavServices } from '@/lib/services'
import { Container } from './Container'
import { HeaderClient } from './HeaderClient'
import { Wordmark } from './Wordmark'

/** Server component: fetches the published services and print categories once for the dropdowns and mobile menu. */
export async function Header() {
  const [services, prints] = await Promise.all([loadNavServices(), loadNavPrints()])
  return (
    <header className="sticky top-0 z-50 border-b border-line-12 bg-paper/94 backdrop-blur-[10px]">
      <Container className="flex h-[76px] items-center justify-between gap-6">
        <Link href="/" aria-label="Art Houz, home" className="hit-44 flex items-center">
          <Wordmark />
        </Link>
        <HeaderClient services={services} prints={prints} />
      </Container>
    </header>
  )
}
