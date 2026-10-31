import { notFound } from '@/lib/server/http/errors'
import { route } from '@/lib/server/http/route'

// Unknown /api paths answer with the JSON envelope instead of Next's HTML not-found page.
const unknownEndpoint = route<{ path: string[] }>('public', () => {
  throw notFound('No such endpoint')
})

export const GET = unknownEndpoint
export const POST = unknownEndpoint
export const PUT = unknownEndpoint
export const PATCH = unknownEndpoint
export const DELETE = unknownEndpoint
