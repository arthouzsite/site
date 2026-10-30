import { publicExhibitionListSchema } from '@arthouz/shared'
import type { Metadata } from 'next'
import { CityChips } from '@/components/exhibitions/CityChips'
import { EmptyState } from '@/components/exhibitions/EmptyState'
import { ExhibitionRow } from '@/components/exhibitions/ExhibitionRow'
import { StatusChips } from '@/components/exhibitions/StatusChips'
import { Container } from '@/components/site/Container'
import { apiGet } from '@/lib/api'
import { buildExhibitionQuery, parseExhibitionParams } from '@/lib/searchParams'
import { TAGS } from '@/lib/tags'

export const metadata: Metadata = { title: { absolute: 'Exhibitions – Art Houz' } }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function ExhibitionsPage({ searchParams }: Props) {
  const params = parseExhibitionParams(await searchParams)
  const { items, cities } = await apiGet(`/public/exhibitions${buildExhibitionQuery(params)}`, publicExhibitionListSchema, [TAGS.exhibitions])
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <h1 className="m-0 mb-10 font-display text-[clamp(56px,9vw,148px)] leading-[0.9] font-normal tracking-[-0.02em]">Exhibitions</h1>
        <div className="mb-14 flex flex-wrap items-center gap-x-10 gap-y-5">
          <StatusChips current={params} />
          <CityChips cities={cities} current={params} />
        </div>
        <div className="flex flex-col">
          {items.map((exhibition) => (
            <ExhibitionRow key={exhibition.id} exhibition={exhibition} />
          ))}
          {items.length === 0 && <EmptyState />}
        </div>
      </Container>
    </main>
  )
}
