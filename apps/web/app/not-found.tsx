import { Container } from '@/components/site/Container'
import { TextLink } from '@/components/site/TextLink'

export default function NotFound() {
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <h1 className="m-0 mb-6 font-display text-[clamp(56px,9vw,148px)] leading-[0.9] font-normal tracking-[-0.02em]">Not found</h1>
        <p className="m-0 mb-8 max-w-[560px] text-[15.5px] leading-[1.65] text-body">
          The page you are looking for has moved or no longer exists.
        </p>
        <TextLink href="/" underline>
          Back to home →
        </TextLink>
      </Container>
    </main>
  )
}
