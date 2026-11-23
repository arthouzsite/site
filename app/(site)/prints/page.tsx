import type { Metadata } from 'next'
import { PrintCategoryTile } from '@/components/prints/PrintCategoryTile'
import { Container } from '@/components/site/Container'
import { PageTitle } from '@/components/site/PageTitle'
import { getPrints } from '@/lib/prints'

const PRIORITY_TILES = 3

export function generateMetadata(): Metadata {
  return { title: 'Prints' }
}

export default async function PrintsPage() {
  const categories = await getPrints()
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <PageTitle className="mb-14">Prints</PageTitle>
        {categories.length === 0 && <p className="m-0 text-[15.5px] leading-[1.65] text-body">No prints to show yet.</p>}
        <ul className="m-0 grid list-none gap-x-[clamp(16px,2vw,28px)] gap-y-12 p-0" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,300px),1fr))' }}>
          {categories.map((category, index) => (
            <li key={category.id}>
              <PrintCategoryTile category={category} priority={index < PRIORITY_TILES} />
            </li>
          ))}
        </ul>
      </Container>
    </main>
  )
}
