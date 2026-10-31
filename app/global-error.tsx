'use client'

import { useEffect } from 'react'
import '@/styles/globals.css'
import { fontVariables } from './fonts'

type Props = { error: Error & { digest?: string }; reset: () => void }

/** Last-resort boundary when the root layout itself fails; renders its own html/body. */
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[web] root layout error', error.digest ?? error.message)
  }, [error])

  return (
    <html lang="en" className={fontVariables}>
      <body>
        <main className="flex min-h-screen flex-col items-start justify-center gap-8 bg-ink px-[clamp(20px,4vw,56px)] font-ui text-paper">
          <h1 className="m-0 font-display text-[clamp(44px,7vw,112px)] leading-[0.92] font-normal">Something went wrong</h1>
          <button
            type="button"
            onClick={reset}
            className="h-10 cursor-pointer border border-solid border-paper bg-transparent px-4 py-0 font-ui text-[12px] tracking-[0.16em] text-paper uppercase hover:bg-paper hover:text-ink"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
