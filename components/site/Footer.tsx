import Link from 'next/link'
import { connection } from 'next/server'
import { loadFooterData } from '@/lib/footer-data'
import { FOOTER_NAV } from '@/lib/nav'
import { currentYear } from '@/lib/site-clock'
import { Container } from './Container'
import { FooterLocation } from './FooterLocation'
import { SocialIcon, type SocialNetwork } from './SocialIcon'
import { Wordmark } from './Wordmark'

const HTTP_URL = /^https?:\/\//i
const DARK_LINK = 'text-paper hover:text-amber'
/** The footer links run in columns of this many. */
const LINKS_PER_COLUMN = 4

export async function Footer() {
  const data = await loadFooterData()
  // A degraded shell must not be cached as the static page: render per request until the API is back.
  if (data.degraded) await connection()
  const year = currentYear()
  const years = data.copyrightFrom < year ? `${data.copyrightFrom} – ${year}` : String(year)
  const socials = ([
    { network: 'instagram', label: 'Instagram', href: data.instagramUrl },
    { network: 'facebook', label: 'Facebook', href: data.facebookUrl },
    { network: 'linkedin', label: 'LinkedIn', href: data.linkedinUrl },
    { network: 'youtube', label: 'YouTube', href: data.youtubeUrl },
    { network: 'twitter', label: 'Twitter', href: data.twitterUrl },
  ] satisfies ReadonlyArray<{ network: SocialNetwork; label: string; href: string | null }>)
    .filter((social): social is { network: SocialNetwork; label: string; href: string } => social.href !== null && HTTP_URL.test(social.href))

  return (
    <footer className="bg-ink text-paper">
      <Container className="pt-[clamp(56px,7vw,96px)] pb-8">
        <div className="flex flex-wrap justify-between gap-12">
          <div className="flex flex-[1_1_320px] flex-col gap-5">
            <Wordmark tone="paper" className="h-[72px] self-start" />
            <p className="m-0 max-w-[360px] font-display text-[24px] leading-[1.3] text-ondark">{data.tagline}</p>
          </div>
          <div className="flex flex-[2_1_680px] flex-wrap gap-x-14 gap-y-10">
            <div className="flex flex-col gap-7">
              <nav aria-label="Footer" className="grid grid-flow-col gap-x-12 gap-y-3" style={{ gridTemplateRows: `repeat(${LINKS_PER_COLUMN}, auto)` }}>
                {FOOTER_NAV.map((item) => (
                  <Link key={item.label} href={item.href} className={`hit-44 text-[15px] ${DARK_LINK}`}>
                    {item.label}
                  </Link>
                ))}
              </nav>
              {socials.length > 0 && (
                <ul aria-label="Social media" className="m-0 flex list-none flex-wrap gap-5 p-0">
                  {socials.map((social) => (
                    <li key={social.network}>
                      <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`${social.label} (opens in a new tab)`} className={`hit-44 block ${DARK_LINK}`}>
                        <SocialIcon network={social.network} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {data.locations.map((location) => (
              <FooterLocation key={location.id} location={location} />
            ))}
          </div>
        </div>
        <div className="mt-14 border-t border-line-dark-18 pt-6 text-[13px] text-meta">© {years} Art Houz. All rights reserved.</div>
      </Container>
    </footer>
  )
}
