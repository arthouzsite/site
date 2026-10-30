import { PNG } from 'pngjs'

export type Box = { x: number; y: number; width: number; height: number }

export function decodePng(buffer: Buffer): PNG {
  return PNG.sync.read(buffer)
}

export function encodePng(png: PNG): Buffer {
  return PNG.sync.write(png)
}

/** Copies a rectangle out of a PNG; the box is rounded to whole pixels and clamped to the image. */
export function cropPng(buffer: Buffer, box: Box): Buffer {
  const source = decodePng(buffer)
  const x = Math.max(0, Math.round(box.x))
  const y = Math.max(0, Math.round(box.y))
  const width = Math.min(source.width - x, Math.round(box.width))
  const height = Math.min(source.height - y, Math.round(box.height))
  if (width <= 0 || height <= 0) throw new Error(`cropPng: empty crop ${JSON.stringify(box)} of ${source.width}x${source.height}`)
  const target = new PNG({ width, height })
  PNG.bitblt(source, target, x, y, width, height, 0, 0)
  return encodePng(target)
}
