import { publicLocationSchema } from '@/lib/shared'
import type { Metadata } from 'next'
import { z } from 'zod'
import { LocationCard } from '@/components/visit/LocationCard'
import { Container } from '@/components/site/Container'
import { apiGet } from '@/lib/api'
import { TAGS } from '@/lib/tags'
import { PageTitle } from '@/components/site/PageTitle'

export function generateMetadata(): Metadata {
  return { title: 'Visit' }
}

export default async function VisitPage() {
  const locations = await apiGet('/public/locations', z.array(publicLocationSchema), [TAGS.locations])
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <PageTitle className="mb-14">Visit</PageTitle>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] gap-x-[clamp(24px,4vw,64px)] gap-y-[72px]">
          {locations.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>
      </Container>
    </main>
  )
}
