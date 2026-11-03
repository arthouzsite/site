import { publicFairSchema } from '@/lib/shared'
import type { Metadata } from 'next'
import { z } from 'zod'
import { FairRow } from '@/components/fairs/FairRow'
import { Container } from '@/components/site/Container'
import { apiGet } from '@/lib/api'
import { TAGS } from '@/lib/tags'
import { PageTitle } from '@/components/site/PageTitle'

export function generateMetadata(): Metadata {
  return { title: 'Fairs' }
}

export default async function FairsPage() {
  const fairs = await apiGet('/public/fairs', z.array(publicFairSchema), [TAGS.fairs])
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <PageTitle className="mb-14">Fairs</PageTitle>
        {fairs.map((fair) => (
          <FairRow key={fair.id} fair={fair} />
        ))}
      </Container>
    </main>
  )
}
