import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Footer } from '@/components/site/Footer'
import { Header } from '@/components/site/Header'
import { SiteChrome } from '@/components/site/SiteChrome'
import { APP_ROOT_ID } from '@/lib/dom'
import { loadSiteMetadata } from '@/lib/site-metadata'
import { fontVariables } from './fonts'
import '@/styles/globals.css'

export function generateMetadata(): Promise<Metadata> {
  return loadSiteMetadata()
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <div id={APP_ROOT_ID} className="min-h-screen bg-paper font-ui text-ink">
          <SiteChrome header={<Header />} footer={<Footer />}>
            {children}
          </SiteChrome>
        </div>
      </body>
    </html>
  )
}
