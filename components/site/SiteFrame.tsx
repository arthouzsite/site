import type { ReactNode } from 'react'
import { Footer } from './Footer'
import { Header } from './Header'

/** The public site's chrome: header above, footer below. Owned by the (site) route group, not the root layout. */
export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}
