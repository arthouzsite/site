import { publicFairSchema } from '@arthouz/shared'
import type { Metadata } from 'next'
import { z } from 'zod'
import { FairRow } from '@/components/fairs/FairRow'
import { Container } from '@/components/site/Container'
import { apiGet } from '@/lib/api'
import { TAGS } from '@/lib/tags'

export function generateMetadata(): Metadata {
  return { title: 'Fairs' }
}

export default async function FairsPage() {
  const fairs = await apiGet('/public/fairs', z.array(publicFairSchema), [TAGS.fairs])
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <h1 className="m-0 mb-14 font-display text-[clamp(56px,9vw,148px)] leading-[0.9] font-normal tracking-[-0.02em]">Fairs</h1>
        {fairs.map((fair) => (
          <FairRow key={fair.id} fair={fair} />
        ))}
      </Container>
    </main>
  )
}
