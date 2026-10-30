import { publicLocationSchema } from '@arthouz/shared'
import type { Metadata } from 'next'
import { z } from 'zod'
import { LocationCard } from '@/components/visit/LocationCard'
import { Container } from '@/components/site/Container'
import { apiGet } from '@/lib/api'
import { TAGS } from '@/lib/tags'

export function generateMetadata(): Metadata {
  return { title: 'Visit' }
}

export default async function VisitPage() {
  const locations = await apiGet('/public/locations', z.array(publicLocationSchema), [TAGS.locations])
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <h1 className="m-0 mb-14 font-display text-[clamp(56px,9vw,148px)] leading-[0.9] font-normal tracking-[-0.02em]">Visit</h1>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] gap-x-[clamp(24px,4vw,64px)] gap-y-[72px]">
          {locations.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>
      </Container>
    </main>
  )
}
