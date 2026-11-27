import type { ReactNode } from 'react'

export type SocialNetwork = 'instagram' | 'facebook' | 'linkedin' | 'youtube' | 'twitter'

/** Line drawings on a 24 px grid, in the stroke weight of the header's search icon. */
const GLYPHS: Record<SocialNetwork, ReactNode> = {
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="0.6" fill="currentColor" />
    </>
  ),
  facebook: <path d="M14.5 21v-8h2.6l.4-3h-3V8.2c0-.9.4-1.5 1.6-1.5h1.5V4.1C17.2 4 16.4 4 15.5 4 13.3 4 12 5.3 12 7.7V10H9.5v3H12v8" />,
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M8 10.5V16.5M8 7.5v.1M11.5 16.5v-6M11.5 13.2c0-1.7 1-2.7 2.3-2.7s2.2 1 2.2 2.7v3.3" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.2 9.3v5.4l4.6-2.7z" />
    </>
  ),
  twitter: <path d="M4.5 4.5l15 15M19.5 4.5l-15 15" />,
}

export function SocialIcon({ network }: { network: SocialNetwork }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="block">
      {GLYPHS[network]}
    </svg>
  )
}
