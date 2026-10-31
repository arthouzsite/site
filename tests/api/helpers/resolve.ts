import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const API_ROOT = join(process.cwd(), 'app', 'api')
const ROUTE_FILE = 'route.ts'
const PARAM_SEGMENT = /^\[([^\].]+)\]$/
const CATCH_ALL_SEGMENT = /^\[\.\.\.([^\]]+)\]$/

type RouteEntry = { segments: readonly string[]; file: string }
type ParamValue = string | string[]
export type RouteHandler = (request: Request, context: { params: Promise<Record<string, ParamValue>> }) => Promise<Response>
export type ResolvedRoute = { handler: RouteHandler | undefined; params: Record<string, ParamValue> }

function collectRoutes(directory: string, segments: readonly string[]): RouteEntry[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return collectRoutes(join(directory, entry.name), [...segments, entry.name])
    return entry.name === ROUTE_FILE ? [{ segments, file: join(directory, entry.name) }] : []
  })
}

/** Match precedence: a literal segment beats [param], which beats a [...rest] catch-all. */
function rank(segment: string | undefined): number {
  if (segment === undefined) return 0
  if (CATCH_ALL_SEGMENT.test(segment)) return 2
  return PARAM_SEGMENT.test(segment) ? 1 : 0
}

function byPrecedence(a: RouteEntry, b: RouteEntry): number {
  for (let i = 0; i < Math.min(a.segments.length, b.segments.length); i += 1) {
    const diff = rank(a.segments[i]) - rank(b.segments[i])
    if (diff !== 0) return diff
  }
  return 0
}

let routeTable: readonly RouteEntry[] | undefined

function routes(): readonly RouteEntry[] {
  routeTable ??= collectRoutes(API_ROOT, []).sort(byPrecedence)
  return routeTable
}

function matchParams(route: RouteEntry, parts: readonly string[]): Record<string, ParamValue> | null {
  const params: Record<string, ParamValue> = {}
  for (let i = 0; i < route.segments.length; i += 1) {
    const segment = route.segments[i] ?? ''
    const catchAll = CATCH_ALL_SEGMENT.exec(segment)?.[1]
    if (catchAll) {
      // A catch-all is last and needs at least one segment, as in Next.
      if (parts.length <= i) return null
      params[catchAll] = parts.slice(i).map(decodeURIComponent)
      return params
    }
    const part = parts[i]
    if (part === undefined) return null
    const name = PARAM_SEGMENT.exec(segment)?.[1]
    if (name) params[name] = decodeURIComponent(part)
    else if (segment !== part) return null
  }
  return route.segments.length === parts.length ? params : null
}

/** Maps a request path (without query string) to the route module under app/api and its params; undefined when no route matches. */
export async function resolveRoute(method: string, pathname: string): Promise<ResolvedRoute | undefined> {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'api') return undefined
  const apiParts = parts.slice(1)
  for (const route of routes()) {
    const params = matchParams(route, apiParts)
    if (!params) continue
    const mod = (await import(/* @vite-ignore */ pathToFileURL(route.file).href)) as Record<string, RouteHandler | undefined>
    return { handler: mod[method.toUpperCase()], params }
  }
  return undefined
}
