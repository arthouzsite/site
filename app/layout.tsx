import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { APP_ROOT_ID } from '@/lib/dom'
import { siteUrl } from '@/lib/site-url'
import { fontVariables } from './fonts'
import '@/styles/globals.css'

/** App-wide metadata only; the site's title, description and Open Graph come from app/(site)/layout.tsx. */
export const metadata: Metadata = { metadataBase: new URL(`${siteUrl()}/`) }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <div id={APP_ROOT_ID} className="min-h-screen bg-paper font-ui text-ink">
          {children}
        </div>
      </body>
    </html>
  )
}
