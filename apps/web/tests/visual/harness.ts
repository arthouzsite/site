import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, type Page } from '@playwright/test'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { normaliseReference } from './normalise'
import { decodePng, encodePng } from './png'
import { API_URL, PORT_URL, RESULTS_DIR, VISUAL_RESULTS_DIR } from './paths'

export type PrototypeRoute = { page: string; param?: string | null }
export type PrototypeProps = { heroLayout?: 'Full-bleed' | 'Split'; artistIndex?: 'Grouped A–Z' | 'Flowing' }
type Viewport = { width: number; height?: number }
type MatchOptions = { name: string; maxDiffRatio?: number; maxHeightDelta?: number }
export type MatchResult = { name: string; diffRatio: number; heightDelta: number; width: number; height: number }

const DEFAULT_VIEWPORT_HEIGHT = 900
const DEFAULT_MAX_DIFF_RATIO = 0.005
const DEFAULT_MAX_HEIGHT_DELTA = 4
const PIXELMATCH_THRESHOLD = 0.1
const SCROLL_STEP_DELAY_MS = 60
const PROP_DEFAULTS: Record<keyof PrototypeProps, string> = { heroLayout: 'Full-bleed', artistIndex: 'Grouped A–Z' }

let normalised: Promise<string> | undefined

function normalisedReference(): Promise<string> {
  normalised ??= normaliseReference(API_URL)
  return normalised
}

/** Rewrites the `data-props` defaults (HTML-escaped JSON) in a copy of the normalised file. */
async function withProps(file: string, props: PrototypeProps): Promise<string> {
  const entries = Object.entries(props).filter(([key, value]) => value && value !== PROP_DEFAULTS[key as keyof PrototypeProps])
  if (entries.length === 0) return file
  const source = await readFile(file, 'utf8')
  const patched = entries.reduce((html, [key, value]) => {
    const from = `&quot;default&quot;:&quot;${PROP_DEFAULTS[key as keyof PrototypeProps]}&quot;`
    if (html.split(from).length !== 2) throw new Error(`harness: data-props default for ${key} not found exactly once`)
    return html.replace(from, `&quot;default&quot;:&quot;${value}&quot;`)
  }, source)
  const variant = path.join(RESULTS_DIR, `reference-${entries.map(([k, v]) => `${k}-${v}`).join('_').replace(/[^a-z0-9-_]/gi, '')}.html`)
  await writeFile(variant, patched, 'utf8')
  return variant
}

type SettleOptions = { networkIdle: boolean }

async function waitForQuiet(page: Page, { networkIdle }: SettleOptions): Promise<void> {
  if (networkIdle) await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete))
}

/**
 * Waits until fonts and images are loaded, after walking the page so lazy images load.
 * The port skips `networkidle`: Next's router keeps link-prefetch requests open, so it never fires.
 */
export async function settle(page: Page, options: SettleOptions): Promise<void> {
  await waitForQuiet(page, options)
  await page.evaluate(async (delay) => {
    const pause = () => new Promise((resolve) => setTimeout(resolve, delay))
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y)
      await pause()
    }
    window.scrollTo(0, document.documentElement.scrollHeight)
    await pause()
    window.scrollTo(0, 0)
  }, SCROLL_STEP_DELAY_MS)
  await waitForQuiet(page, options)
}

export const PROTOTYPE_SETTLE: SettleOptions = { networkIdle: true }
export const PORT_SETTLE: SettleOptions = { networkIdle: false }

async function open(page: Page, url: string, viewport: Viewport, options: SettleOptions): Promise<Buffer> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height ?? DEFAULT_VIEWPORT_HEIGHT })
  await page.goto(url, { waitUntil: 'load' })
  await settle(page, options)
  return page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' })
}

export async function renderPrototype(page: Page, options: { route: PrototypeRoute; props?: PrototypeProps } & Viewport): Promise<Buffer> {
  const file = await withProps(await normalisedReference(), options.props ?? {})
  const route = { page: options.route.page, param: options.route.param ?? null }
  await page.addInitScript((value) => window.localStorage.setItem('arthouz-route', value), JSON.stringify(route))
  return open(page, pathToFileURL(file).href, options, PROTOTYPE_SETTLE)
}

export async function renderPort(page: Page, options: { path: string } & Viewport): Promise<Buffer> {
  return open(page, `${PORT_URL}${options.path}`, options, PORT_SETTLE)
}

function cropTo(png: PNG, height: number): PNG {
  const target = new PNG({ width: png.width, height })
  PNG.bitblt(png, target, 0, 0, png.width, height, 0, 0)
  return target
}

/** Compares two screenshots pixel by pixel; writes prototype/port/diff PNGs on failure (always with VISUAL_WRITE_ALL=1). */
export async function expectVisualMatch(prototype: Buffer, port: Buffer, options: MatchOptions): Promise<MatchResult> {
  const a = decodePng(prototype)
  const b = decodePng(port)
  expect(b.width, `${options.name}: screenshot widths differ`).toBe(a.width)
  const height = Math.min(a.height, b.height)
  const diff = new PNG({ width: a.width, height })
  const changed = pixelmatch(cropTo(a, height).data, cropTo(b, height).data, diff.data, a.width, height, { threshold: PIXELMATCH_THRESHOLD, includeAA: false })
  const result: MatchResult = { name: options.name, diffRatio: changed / (a.width * height), heightDelta: Math.abs(a.height - b.height), width: a.width, height }
  const maxDiffRatio = options.maxDiffRatio ?? DEFAULT_MAX_DIFF_RATIO
  const maxHeightDelta = options.maxHeightDelta ?? DEFAULT_MAX_HEIGHT_DELTA
  const outDir = path.join(VISUAL_RESULTS_DIR, options.name)
  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2))
  const failed = result.diffRatio > maxDiffRatio || result.heightDelta > maxHeightDelta
  if (failed || process.env.VISUAL_WRITE_ALL === '1') {
    await Promise.all([
      writeFile(path.join(outDir, 'prototype.png'), prototype),
      writeFile(path.join(outDir, 'port.png'), port),
      writeFile(path.join(outDir, 'diff.png'), encodePng(diff)),
    ])
  }
  expect(result.diffRatio, `${options.name}: diff ratio (see ${outDir})`).toBeLessThanOrEqual(maxDiffRatio)
  expect(result.heightDelta, `${options.name}: height delta (see ${outDir})`).toBeLessThanOrEqual(maxHeightDelta)
  return result
}
