'use client'

import { useEffect } from 'react'
import { Container } from '@/components/site/Container'
import { PageTitle } from '@/components/site/PageTitle'

type Props = { error: Error & { digest?: string }; reset: () => void }

export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => {
    console.error('[web] page error', error.digest ?? error.message)
  }, [error])

  return (
    <main>
      <Container className="pt-[clamp(40px,6vw,88px)] pb-[clamp(72px,9vw,140px)]">
        <PageTitle className="mb-6">
          Something went wrong
        </PageTitle>
        <p className="m-0 mb-8 max-w-[560px] text-[15.5px] leading-[1.65] text-body">
          This page could not be loaded. Please try again in a moment.
        </p>
        <button
          type="button"
          onClick={reset}
          className="flex cursor-pointer items-center gap-3 border-none bg-ink px-6 py-4 font-ui text-[12.5px] tracking-[0.16em] text-paper uppercase hover:bg-amber hover:text-ink"
        >
          Try again
        </button>
      </Container>
    </main>
  )
}
