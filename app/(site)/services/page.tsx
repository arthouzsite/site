import type { Metadata } from 'next'
import { ServiceRow } from '@/components/services/ServiceRow'
import { Container } from '@/components/site/Container'
import { getServices } from '@/lib/services'

export function generateMetadata(): Metadata {
  return { title: 'Services' }
}

export default async function ServicesPage() {
  const services = await getServices()
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <h1 className="m-0 mb-14 font-display text-[clamp(56px,9vw,148px)] leading-[0.9] font-normal tracking-[-0.02em]">Services</h1>
        {services.map((service, index) => (
          <ServiceRow key={service.slug} service={service} flipped={index % 2 === 1} />
        ))}
        {services.length === 0 && <p className="m-0 border-t border-line-18 py-8 font-display text-[28px] text-muted">No services are listed right now.</p>}
      </Container>
    </main>
  )
}
