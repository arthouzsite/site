/* eslint-disable @next/next/no-img-element -- A small static file from /public; next/image has nothing to optimise. */

const SOURCES = { ink: '/brand/logo.png', paper: '/brand/logo-on-dark.png' } as const
const WIDTH = 480
const HEIGHT = 264

type Props = {
  /** Lettering colour: ink for the paper header, paper for the ink footer and menu. */
  tone?: keyof typeof SOURCES
  className?: string
}

/** The official Art Houz logo, shared by the header, footer, menu and maintenance screen. */
export function Wordmark({ tone = 'ink', className = 'h-14' }: Props) {
  return <img src={SOURCES[tone]} alt="Art Houz" width={WIDTH} height={HEIGHT} className={`block w-auto ${className}`} />
}
