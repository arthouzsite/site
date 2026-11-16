import { imageLimitError } from '@/lib/shared'

export type ImageSize = { width: number; height: number }
export type ReadImageSize = (file: File) => Promise<ImageSize | null>

/** Decodes the file in the browser just far enough to learn its size; null when the browser cannot read it. */
export const readImageSize: ReadImageSize = async (file) => {
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap
    bitmap.close()
    return { width, height }
  } catch {
    return null
  }
}

/**
 * Plain-English reason an image may not be uploaded, or null. Only images are checked. When the browser cannot read
 * the dimensions the file passes and the server, which always checks, decides.
 */
export async function checkImageFile(file: File, read: ReadImageSize = readImageSize): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null
  const sizeProblem = imageLimitError({ name: file.name, bytes: file.size })
  if (sizeProblem) return sizeProblem
  const size = await read(file)
  return size ? imageLimitError({ name: file.name, bytes: file.size, ...size }) : null
}
