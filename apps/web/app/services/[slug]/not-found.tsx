import { Container } from '@/components/site/Container'
import { TextLink } from '@/components/site/TextLink'

export default function ServiceNotFound() {
  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <h1 className="m-0 mb-6 font-display text-[clamp(44px,7vw,112px)] leading-[0.95] font-normal tracking-[-0.015em]">Service not found</h1>
        <p className="m-0 mb-8 max-w-[560px] text-[15.5px] leading-[1.65] text-body">This service has moved or no longer exists.</p>
        <TextLink href="/services" underline>
          All services →
        </TextLink>
      </Container>
    </main>
  )
}
