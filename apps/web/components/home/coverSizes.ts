import type { PublicImage } from '@arthouz/shared'

/** One `sizes` entry: the slot's CSS width, optionally under a media condition. */
export type SlotWidth = { readonly media?: string; readonly width: string }

const FACTOR_DECIMALS = 3

/**
 * How many times wider than its box an object-cover image renders. A landscape image in a portrait
 * box is scaled to the box height, so it is drawn wider than the box (factor > 1).
 */
export function coverFactor(image: PublicImage | null, boxRatio: number): number {
  if (!image || image.width <= 0 || image.height <= 0 || boxRatio <= 0) return 1
  const factor = image.width / image.height / boxRatio
  return factor > 1 ? Number(factor.toFixed(FACTOR_DECIMALS)) : 1
}

/** `sizes` for an object-cover image in a box of `boxRatio` (width / height) whose width follows `widths`. */
export function coverSizes(image: PublicImage | null, boxRatio: number, widths: readonly SlotWidth[]): string {
  const factor = coverFactor(image, boxRatio)
  return widths
    .map(({ media, width }) => {
      const rendered = factor === 1 ? width : `calc(${width} * ${factor})`
      return media ? `${media} ${rendered}` : rendered
    })
    .join(', ')
}

/** `sizes` for an object-cover image filling a full-width box of fixed CSS `height`. */
export function fullWidthCoverSizes(image: PublicImage | null, height: string): string {
  if (!image || image.width <= 0 || image.height <= 0) return '100vw'
  const aspect = Number((image.width / image.height).toFixed(FACTOR_DECIMALS))
  return `max(100vw, calc(${height} * ${aspect}))`
}
