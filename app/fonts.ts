import { EB_Garamond, Noto_Serif_Tamil, Space_Grotesk } from 'next/font/google'

// Faces are registered under their literal family names (Turbopack), which styles/tokens.css uses directly.
// next/font still emits a size-adjusted "… Fallback" face inside the --font-* variables despite
// adjustFontFallback: false, so tokens.css does not route through those variables.
export const ebGaramond = EB_Garamond({
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-eb-garamond',
})

export const spaceGrotesk = Space_Grotesk({
  weight: ['400', '500', '600'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-space-grotesk',
})

export const notoSerifTamil = Noto_Serif_Tamil({
  weight: ['400', '500'],
  subsets: ['tamil'],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  variable: '--font-noto-serif-tamil',
})

export const fontVariables = [ebGaramond.variable, spaceGrotesk.variable, notoSerifTamil.variable].join(' ')
