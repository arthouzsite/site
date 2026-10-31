import { createHash } from 'node:crypto'
import type { Page } from '@playwright/test'
import { PNG } from 'pngjs'
import { encodePng } from './png'

/**
 * The seed and the prototype both point at picsum placeholders. Fetching them live made the pixel comparison
 * depend on the network: one image-only miss per full run that passed on rerun. Both pages instead get the same
 * solid-colour PNG per URL, sized from the `/seed/<name>/<w>/<h>` path, so identical bytes keep the comparison valid.
 */

const PICSUM_URL = /^https:\/\/(fastly\.)?picsum\.photos\//
const SEED_PATH = /^\/seed\/[^/]+\/(\d+)\/(\d+)$/
const FALLBACK_SIZE = { width: 600, height: 400 }
const MAX_DIMENSION = 4000
const ALPHA_OPAQUE = 255

const cache = new Map<string, Buffer>()

function sizeOf(pathname: string): { width: number; height: number } {
  const match = SEED_PATH.exec(pathname)
  if (!match) return FALLBACK_SIZE
  return { width: Math.min(Number(match[1]), MAX_DIMENSION), height: Math.min(Number(match[2]), MAX_DIMENSION) }
}

/** A solid PNG whose colour is a hash of the path, so each placeholder stays distinguishable but never changes. */
export function placeholderPng(url: string): Buffer {
  const { pathname } = new URL(url)
  const cached = cache.get(pathname)
  if (cached) return cached
  const [red = 0, green = 0, blue = 0] = createHash('sha1').update(pathname).digest()
  const { width, height } = sizeOf(pathname)
  const png = new PNG({ width, height })
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = red
    png.data[offset + 1] = green
    png.data[offset + 2] = blue
    png.data[offset + 3] = ALPHA_OPAQUE
  }
  const encoded = encodePng(png)
  cache.set(pathname, encoded)
  return encoded
}

const stubbed = new WeakSet<Page>()

export async function stubPicsum(page: Page): Promise<void> {
  if (stubbed.has(page)) return
  stubbed.add(page)
  await page.route(PICSUM_URL, (route) => route.fulfill({ status: 200, contentType: 'image/png', body: placeholderPng(route.request().url()) }))
}
