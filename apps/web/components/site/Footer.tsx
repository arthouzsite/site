import Link from 'next/link'
import { FOOTER_NAV } from '@/lib/nav'
import { getLocations, getSettings } from '@/lib/site-data'
import { Container } from './Container'
import { FooterLocation } from './FooterLocation'
import { Wordmark } from './Wordmark'

const DARK_LINK = 'text-paper hover:text-amber'

export async function Footer() {
  const [settings, locations] = await Promise.all([getSettings(), getLocations()])
  const { tagline, copyrightFrom, instagramUrl, facebookUrl } = settings.footer
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-ink text-paper">
      <Container className="pt-[clamp(56px,7vw,96px)] pb-8">
        <div className="flex flex-wrap justify-between gap-12">
          <div className="flex flex-[1_1_320px] flex-col gap-5">
            <div className="flex items-end gap-[10px]">
              <Wordmark />
            </div>
            <p className="m-0 max-w-[360px] font-display text-[24px] leading-[1.3] text-ondark">{tagline}</p>
          </div>
          <div className="flex flex-[1_1_420px] flex-wrap gap-x-16 gap-y-10">
            <nav aria-label="Footer" className="flex flex-col gap-3">
              {FOOTER_NAV.map((item) => (
                <Link key={item.label} href={item.href} className={`text-[15px] ${DARK_LINK}`}>
                  {item.label}
                </Link>
              ))}
            </nav>
            {locations.map((location) => (
              <FooterLocation key={location.id} location={location} />
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-wrap justify-between gap-4 border-t border-line-dark-18 pt-6 text-[13px] text-meta">
          <div>
            © {copyrightFrom} – {currentYear} Art Houz. All rights reserved.
          </div>
          <div className="flex gap-6">
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={`hit-44 ${DARK_LINK}`}>
              Instagram ↗
            </a>
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className={`hit-44 ${DARK_LINK}`}>
              Facebook ↗
            </a>
          </div>
        </div>
      </Container>
    </footer>
  )
}
