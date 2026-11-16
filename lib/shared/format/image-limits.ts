import { MAX_IMAGE_DIMENSION_PX, MAX_IMAGE_UPLOAD_BYTES } from '../constants'

const BYTES_PER_MB = 1024 * 1024
const MAX_IMAGE_MB = MAX_IMAGE_UPLOAD_BYTES / BYTES_PER_MB

/** Shown wherever an image is chosen or uploaded. */
export const IMAGE_LIMIT_HINT = `Keep upload size up to ${MAX_IMAGE_MB} MB and ${MAX_IMAGE_DIMENSION_PX} px on the longer side`

export type ImageFacts = { name?: string; bytes: number; width?: number; height?: number }

const subject = (name?: string) => (name ? `"${name}"` : 'Image')

/** The first image limit the file breaks as a plain sentence naming the file and the limit, or null when it is fine. */
export function imageLimitError({ name, bytes, width, height }: ImageFacts): string | null {
  if (bytes > MAX_IMAGE_UPLOAD_BYTES) {
    return name ? `"${name}" is larger than ${MAX_IMAGE_MB} MB. Images must be ${MAX_IMAGE_MB} MB or smaller.` : `Images must be ${MAX_IMAGE_MB} MB or smaller`
  }
  if (width !== undefined && height !== undefined && Math.max(width, height) > MAX_IMAGE_DIMENSION_PX) {
    return `${subject(name)} is ${width} x ${height} px. Images can be at most ${MAX_IMAGE_DIMENSION_PX} px on the longer side.`
  }
  return null
}
