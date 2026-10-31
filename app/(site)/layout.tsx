import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SiteFrame } from '@/components/site/SiteFrame'
import { loadSiteMetadata } from '@/lib/site-metadata'

export function generateMetadata(): Promise<Metadata> {
  return loadSiteMetadata()
}

/** Everything public (site pages, their error and not-found boundaries) sits inside the header and footer; /admin does not. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteFrame>{children}</SiteFrame>
}
