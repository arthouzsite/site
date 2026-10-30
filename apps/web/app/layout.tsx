import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Footer } from '@/components/site/Footer'
import { Header } from '@/components/site/Header'
import { fontVariables } from './fonts'
import '@/styles/globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Art Houz', template: '%s · Art Houz' },
  description: 'Contemporary art from South India. Chennai & Bengaluru, since 2012.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <div className="min-h-screen bg-paper font-ui text-ink">
          <Header />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  )
}
