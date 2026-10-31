import Link from 'next/link'
import { loadNavServices } from '@/lib/services'
import { Container } from './Container'
import { HeaderClient } from './HeaderClient'
import { Wordmark } from './Wordmark'

/** Server component: fetches the published services once (tag `services`) for the dropdown and mobile menu. */
export async function Header() {
  const services = await loadNavServices()
  return (
    <header className="sticky top-0 z-50 border-b border-line-12 bg-paper/94 backdrop-blur-[10px]">
      <Container className="flex h-[76px] items-center justify-between gap-6">
        <Link href="/" aria-label="Art Houz, home" className="hit-44 flex items-end gap-[10px] text-ink hover:text-ink">
          <Wordmark />
        </Link>
        <HeaderClient services={services} />
      </Container>
    </header>
  )
}
