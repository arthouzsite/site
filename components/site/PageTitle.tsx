import type { ReactNode } from 'react'

export type PageTitleVariant = 'index' | 'detail'

const VARIANTS: Record<PageTitleVariant, string> = {
  /** Section index pages: Exhibitions, Artists, Fairs, News, Services, About, Visit, and the error pages. */
  index: 'text-[clamp(56px,9vw,148px)] leading-[0.9] tracking-[-0.02em]',
  /** Record pages: one exhibition, artist or service, whose titles can run long. */
  detail: 'text-[clamp(44px,7vw,112px)] leading-[0.95] tracking-[-0.015em] text-balance',
}

type Props = { children: ReactNode; variant?: PageTitleVariant; className?: string; id?: string }

/**
 * The one H1 of a site page, in the display face at one of two shared scales, so every page's heading reads the same
 * (FIN-3512). The home hero keeps its own composition in HeroFullBleed / HeroSplit.
 */
export function PageTitle({ children, variant = 'index', className = '', id }: Props) {
  return (
    <h1 id={id} className={`m-0 font-display font-normal ${VARIANTS[variant]} ${className}`}>
      {children}
    </h1>
  )
}
