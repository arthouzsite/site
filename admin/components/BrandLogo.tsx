/* eslint-disable @next/next/no-img-element -- Small static files from /public; next/image has nothing to optimise. */

const SOURCES = {
  /** Mark and lettering, with light lettering for the ink sidebar and sign-in panel. */
  full: { src: '/brand/logo-on-dark.png', width: 480, height: 264 },
  /** The mark alone, for the collapsed sidebar. */
  mark: { src: '/brand/mark.png', width: 256, height: 256 },
} as const

type Props = { variant: keyof typeof SOURCES; alt?: string; className: string }

/** The official Art Houz logo on the CMS's dark surfaces. */
export function BrandLogo({ variant, alt = '', className }: Props) {
  return <img {...SOURCES[variant]} alt={alt} className={`block w-auto ${className}`} />
}
