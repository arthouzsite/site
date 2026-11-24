import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SiteFrame } from '@/components/site/SiteFrame'
import { loadSiteMetadata } from '@/lib/site-metadata'

export function generateMetadata(): Promise<Metadata> {
  return loadSiteMetadata()
}

/**
 * Every public page except the home page (which has its own layout in app/(home)) sits inside the header and
 * footer, with their error and not-found boundaries; /admin does not.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteFrame>{children}</SiteFrame>
}
