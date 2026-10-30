import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NORMALISED_FILE, REFERENCE_ASSETS, REFERENCE_DIR, REFERENCE_FILE, RESULTS_DIR } from './paths'

type Envelope<T> = { ok: boolean; data: T | null; error: { code: string; message: string } | null }
type ArtistList = { flat: ReadonlyArray<{ name: string }> }
type NewsItem = { title: string }

const ARTISTS_PATTERN = /const AH_ARTISTS = \[[^\]]*\];/g
const NEWS_PATTERN = /const AH_NEWS = \[\n([\s\S]*?)\n\];/g
const HOME_NEWS_SLICE = 'AH_NEWS.slice(1, 4)'
const READ_ARTICLE_PATTERN = /<a href="#" onClick="\{\{ n\.read \}\}"[^>]*>Read article ↗<\/a>/g
const NEWS_LIST_MAPPING = 'newsList: AH_NEWS.map(n => ({ ...n, '

async function getData<T>(apiUrl: string, pathname: string): Promise<T> {
  const response = await fetch(`${apiUrl}${pathname}`)
  if (!response.ok) throw new Error(`normalise: GET ${pathname} failed with HTTP ${response.status}`)
  const body = (await response.json()) as Envelope<T>
  if (!body.ok || body.data === null) throw new Error(`normalise: GET ${pathname} returned ${body.error?.code ?? 'no data'}`)
  return body.data
}

function toGlobalRegExp(pattern: string | RegExp): RegExp {
  if (typeof pattern === 'string') return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
  return pattern.flags.includes('g') ? pattern : new RegExp(pattern.source, `${pattern.flags}g`)
}

/** Replaces exactly one match of `pattern`, throwing when there are zero or several. */
export function replaceOnce(source: string, pattern: string | RegExp, replace: (match: string, ...groups: string[]) => string, label: string): string {
  const matches = [...source.matchAll(toGlobalRegExp(pattern))]
  const [match] = matches
  if (matches.length !== 1 || !match || match.index === undefined) {
    throw new Error(`normalise: patch "${label}" expected exactly one match, found ${matches.length}`)
  }
  const [whole, ...groups] = match
  return source.slice(0, match.index) + replace(whole, ...groups) + source.slice(match.index + whole.length)
}

function evaluateTitles(lines: readonly string[]): string[] {
  // The prototype's data block is trusted, checked-in source; evaluating it avoids re-implementing a JS string parser.
  const items = new Function(`return [${lines.map((line) => line.replace(/,\s*$/, '')).join(',')}]`)() as NewsItem[]
  return items.map((item) => item.title)
}

/** Throws listing names present on one side only; order is ignored. */
export function assertSameNames(label: string, prototype: readonly string[], api: readonly string[]): void {
  const missing = prototype.filter((name) => !api.includes(name))
  const extra = api.filter((name) => !prototype.includes(name))
  const duplicates = prototype.length !== new Set(prototype).size || api.length !== new Set(api).size
  if (missing.length === 0 && extra.length === 0 && !duplicates) return
  throw new Error(
    `normalise: ${label} differ between the prototype and the API` +
      `\n  missing from API: ${JSON.stringify(missing)}\n  extra in API: ${JSON.stringify(extra)}` +
      (duplicates ? '\n  (duplicate names present)' : ''),
  )
}

export function reorderArtists(source: string, names: readonly string[]): string {
  return replaceOnce(source, ARTISTS_PATTERN, (literal) => {
    // Trusted, checked-in prototype source (see evaluateTitles).
    const prototypeNames = new Function(`${literal} return AH_ARTISTS;`)() as string[]
    assertSameNames('artist names', prototypeNames, names)
    return `const AH_ARTISTS = ${JSON.stringify(names)};`
  }, 'AH_ARTISTS order')
}

export function reorderNews(source: string, titles: readonly string[]): string {
  return replaceOnce(source, NEWS_PATTERN, (_whole, body = '') => {
    const lines = body.split('\n')
    const prototypeTitles = evaluateTitles(lines)
    if (prototypeTitles.length !== titles.length) {
      throw new Error(`normalise: AH_NEWS has ${prototypeTitles.length} items but the API returned ${titles.length}`)
    }
    const ordered = titles.map((title) => {
      const index = prototypeTitles.indexOf(title)
      if (index < 0) throw new Error(`normalise: API news title not found in AH_NEWS: ${title}`)
      return (lines[index] ?? '').replace(/,\s*$/, '')
    })
    return `const AH_NEWS = [\n${ordered.join(',\n')}\n];`
  }, 'AH_NEWS order')
}

export function patchHomeNewsSlice(source: string): string {
  return replaceOnce(source, HOME_NEWS_SLICE, () => 'AH_NEWS.slice(0, 3)', 'home news slice')
}

export function hideReadArticle(source: string): string {
  const wrapped = replaceOnce(source, READ_ARTICLE_PATTERN,
    (anchor) => `<sc-if value="{{ n.hasUrl }}" hint-placeholder-val="{{ false }}">${anchor}</sc-if>`, 'Read article anchor')
  return replaceOnce(wrapped, NEWS_LIST_MAPPING, (match) => `${match}hasUrl: !!n.externalUrl, `, 'newsList hasUrl')
}

/** Writes the patched prototype (and its runtime scripts) under test-results and returns its path. */
export async function normaliseReference(apiUrl: string): Promise<string> {
  const [artists, news] = await Promise.all([
    getData<ArtistList>(apiUrl, '/public/artists'),
    getData<NewsItem[]>(apiUrl, '/public/news'),
  ])
  const source = await readFile(REFERENCE_FILE, 'utf8')
  const patched = hideReadArticle(patchHomeNewsSlice(reorderNews(reorderArtists(source, artists.flat.map((a) => a.name)), news.map((n) => n.title))))
  await mkdir(RESULTS_DIR, { recursive: true })
  await Promise.all(REFERENCE_ASSETS.map((asset) => copyFile(path.join(REFERENCE_DIR, asset), path.join(RESULTS_DIR, asset))))
  await writeFile(NORMALISED_FILE, patched, 'utf8')
  return NORMALISED_FILE
}
