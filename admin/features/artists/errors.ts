import { ApiError } from '../../lib/api'
import type { ArtistInUseDetails } from './types'

export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Try again.'
}

export function isConflict(err: unknown, code: string): err is ApiError {
  return err instanceof ApiError && err.status === 409 && err.code === code
}

export function inUseDetails(err: ApiError): ArtistInUseDetails {
  const details = (err.details ?? {}) as Partial<ArtistInUseDetails>
  return { exhibitions: details.exhibitions ?? [], workCount: details.workCount ?? 0, artworkCount: details.artworkCount ?? 0 }
}
