import { artistInputSchema } from '@arthouz/shared'
import type { z } from 'zod'
import type { ZodForm } from '../../lib/useZodForm'
import type { AdminArtist } from './types'
import type { ArtistPayload } from './useArtists'

export type ArtistFormValues = z.input<typeof artistInputSchema>
export type ArtistForm = ZodForm<ArtistFormValues>
export { artistInputSchema }

export function defaultsFrom(artist: AdminArtist | null): ArtistFormValues {
  return {
    name: artist?.name ?? '',
    sortName: artist && artist.sortName !== artist.name ? artist.sortName : '',
    slug: artist?.slug ?? '',
    medium: artist?.medium ?? '',
    base: artist?.base ?? '',
    born: artist?.born ?? '',
    lede: artist?.lede ?? '',
    bio: artist?.bio ?? '',
    portraitImageId: artist?.portraitImageId ?? null,
  }
}

/** Full PATCH/POST body. Publish and feature state are deliberately absent: they have their own endpoints. */
export function toPayload(values: ArtistFormValues): ArtistPayload {
  return {
    name: values.name,
    sortName: values.sortName?.trim() ?? '',
    slug: values.slug,
    medium: values.medium ?? '',
    base: values.base ?? '',
    born: values.born?.trim() || null,
    lede: values.lede ?? '',
    bio: values.bio ?? '',
    portraitImageId: values.portraitImageId ?? null,
  }
}
