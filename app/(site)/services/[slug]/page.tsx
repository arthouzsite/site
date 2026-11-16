import type { Metadata } from 'next'
import { notFound, unstable_rethrow } from 'next/navigation'
import { EnquiryTrigger } from '@/components/enquiry/EnquiryTrigger'
import { ServiceContact } from '@/components/services/ServiceContact'
import { Container } from '@/components/site/Container'
import { ImageSlot } from '@/components/site/ImageSlot'
import { PrimaryButton } from '@/components/site/PrimaryButton'
import { ApiError } from '@/lib/api'
import { paragraphs } from '@/lib/format'
import { getService } from '@/lib/services'
import { getLocations } from '@/lib/site-data'
import { detailMetadata } from '@/lib/site-metadata'
import { PageTitle } from '@/components/site/PageTitle'
import { BackLink } from '@/components/site/BackLink'

type Props = { params: Promise<{ slug: string }> }

const NOT_FOUND_STATUS = 404
const DEFAULT_CTA_HREF = '/visit'
const IMAGE_SIZES = '(min-width: 1024px) 45vw, 100vw'
const HTTP_URL = /^https?:\/\//i
/** Hrefs a CTA may use: web, mail, phone, or a same-site path (not protocol-relative). */
const SAFE_CTA_HREF = /^(https?:|mailto:|tel:|\/(?![/\\]))/i

/**
 * Cities for the enquiry form's location select. A failed read or an empty list returns [] so the page falls back
 * to the Visit link instead of showing a form nobody can submit (or an error page).
 */
async function loadEnquiryLocations(): Promise<string[]> {
  try {
    return (await getLocations()).map((location) => location.city)
  } catch (error) {
    // Next's own control-flow errors (build-time bail-outs) are not failures.
    unstable_rethrow(error)
    console.error(`[web] locations unavailable for the enquiry form, linking to the Visit page: ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

async function loadService(slug: string) {
  try {
    return await getService(slug)
  } catch (error) {
    if (error instanceof ApiError && error.status === NOT_FOUND_STATUS) notFound()
    throw error
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = await loadService((await params).slug)
  return detailMetadata({ title: service.title, description: service.summary || paragraphs(service.body)[0] || service.title, image: service.image })
}

export default async function ServicePage({ params }: Props) {
  const service = await loadService((await params).slug)
  // A service without its own link opens the enquiry form; one with a custom link keeps linking to it.
  const hasCustomCta = service.ctaHref.trim() !== ''
  const ctaHref = SAFE_CTA_HREF.test(service.ctaHref) ? service.ctaHref : DEFAULT_CTA_HREF
  const locations = hasCustomCta ? [] : await loadEnquiryLocations()
  const showsForm = !hasCustomCta && locations.length > 0
  return (
    <main>
      <Container className="pt-[clamp(28px,4vw,48px)] pb-[clamp(32px,4vw,56px)]">
        <BackLink href="/services">Services</BackLink>
        <PageTitle variant="detail" className="mt-10 max-w-[1200px]">{service.title}</PageTitle>
        {service.summary && (
          <p className="m-0 mt-5 max-w-[820px] font-display text-[clamp(24px,2.4vw,34px)] leading-[1.3] text-pretty text-body">{service.summary}</p>
        )}
      </Container>
      <Container className="flex flex-wrap gap-x-[clamp(32px,6vw,120px)] gap-y-10 pb-[clamp(72px,9vw,140px)]">
        <ImageSlot image={service.image} ratio="3/2" sizes={IMAGE_SIZES} priority placeholder={service.title} className="min-w-0 flex-[1_1_440px]" />
        <div className="flex min-w-0 flex-[1_1_380px] flex-col justify-center gap-8">
          {paragraphs(service.body).map((paragraph, index) => (
            <p key={index} className="m-0 max-w-[560px] text-[17px] leading-[1.7] text-pretty text-body">
              {paragraph}
            </p>
          ))}
          <ServiceContact contact={service.contact} />
          {showsForm ? (
            <EnquiryTrigger label={service.ctaLabel} target={{ kind: 'SERVICE', slug: service.slug, title: service.title, locations }} />
          ) : (
            <PrimaryButton href={ctaHref} external={HTTP_URL.test(ctaHref)}>
              {service.ctaLabel}
            </PrimaryButton>
          )}
        </div>
      </Container>
    </main>
  )
}
