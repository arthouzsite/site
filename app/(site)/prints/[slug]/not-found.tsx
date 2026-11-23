import { Container } from '@/components/site/Container'
import { PageTitle } from '@/components/site/PageTitle'
import { TextLink } from '@/components/site/TextLink'

export default function PrintCategoryNotFound() {
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <PageTitle variant="detail" className="mb-6">Prints not found</PageTitle>
        <p className="m-0 mb-8 max-w-[560px] text-[15.5px] leading-[1.65] text-body">This print category has moved or no longer exists.</p>
        <TextLink href="/prints" underline>
          All prints →
        </TextLink>
      </Container>
    </main>
  )
}
