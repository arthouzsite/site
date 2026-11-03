import type { Metadata } from 'next'
import { ServiceRow } from '@/components/services/ServiceRow'
import { Container } from '@/components/site/Container'
import { getServices } from '@/lib/services'
import { PageTitle } from '@/components/site/PageTitle'

export function generateMetadata(): Metadata {
  return { title: 'Services' }
}

export default async function ServicesPage() {
  const services = await getServices()
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <PageTitle className="mb-14">Services</PageTitle>
        {services.map((service, index) => (
          <ServiceRow key={service.slug} service={service} flipped={index % 2 === 1} />
        ))}
        {services.length === 0 && <p className="m-0 border-t border-line-18 py-8 font-display text-[28px] text-muted">No services are listed right now.</p>}
      </Container>
    </main>
  )
}
