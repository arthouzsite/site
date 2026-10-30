import Link from 'next/link'
import { Container } from './Container'
import { HeaderClient } from './HeaderClient'
import { Wordmark } from './Wordmark'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line-12 bg-paper/94 backdrop-blur-[10px]">
      <Container className="flex h-[76px] items-center justify-between gap-6">
        <Link href="/" aria-label="Art Houz, home" className="flex items-end gap-[10px] text-ink hover:text-ink">
          <Wordmark />
        </Link>
        <HeaderClient />
      </Container>
    </header>
  )
}
