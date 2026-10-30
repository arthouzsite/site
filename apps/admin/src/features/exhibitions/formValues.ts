import { formatDateRange, type exhibitionInputSchema } from '@arthouz/shared'
import type { z } from 'zod'
import type { ZodForm } from '../../lib/useZodForm'
import type { AdminExhibition } from './types'

export type ExhibitionFormValues = z.input<typeof exhibitionInputSchema>
export type ExhibitionZodForm = ZodForm<ExhibitionFormValues>

const DATE_INPUT_LENGTH = 10

export function defaultValues(): ExhibitionFormValues {
  return {
    slug: undefined,
    title: '',
    subtitle: '',
    city: '',
    country: '',
    type: 'GROUP',
    startDate: '',
    endDate: '',
    datesLabel: null,
    statusOverride: null,
    venue: '',
    blurb: '',
    body: '',
    heroImageId: null,
    artistIds: [],
    isPublished: false,
    sortOrder: 0,
  }
}

/** The API returns the resolved dates label; an override exists only when it differs from the computed range. */
function datesOverride(ex: AdminExhibition): string | null {
  const computed = formatDateRange(new Date(ex.startDate), new Date(ex.endDate))
  return ex.datesLabel && ex.datesLabel !== computed ? ex.datesLabel : null
}

export function valuesFromExhibition(ex: AdminExhibition): ExhibitionFormValues {
  return {
    slug: ex.slug,
    title: ex.title,
    subtitle: ex.subtitle,
    city: ex.city,
    country: ex.country,
    type: ex.type,
    startDate: ex.startDate.slice(0, DATE_INPUT_LENGTH),
    endDate: ex.endDate.slice(0, DATE_INPUT_LENGTH),
    datesLabel: datesOverride(ex),
    statusOverride: ex.statusOverride,
    venue: ex.venue,
    blurb: ex.blurb,
    body: ex.body,
    heroImageId: ex.heroImageId,
    artistIds: ex.artists.map((a) => a.artistId),
    isPublished: ex.isPublished,
    sortOrder: ex.sortOrder,
  }
}

export const FIELD_PROMPTS: Record<string, string> = {
  title: 'Enter a title',
  city: 'Enter a city',
  country: 'Enter a country',
  startDate: 'Enter a start date',
  endDate: 'Enter an end date',
}

export const nullIfBlank = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : null)
export const undefinedIfBlank = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : undefined)
