import { z } from 'zod'
import { httpUrl, idSchema, requiredText, slugSchema, TEL_MESSAGE, TEL_PATTERN } from './common'

const MAX_CTA_HREF = 2000
const MAILTO = 'mailto:'
const TEL = 'tel:'
const CTA_HREF_MESSAGE = 'Use an http(s) link, mailto:name@example.com or tel:+914412345678'

function isValidCtaHref(value: string): boolean {
  if (value === '') return true
  if (value.startsWith(MAILTO)) {
    const [address = ''] = value.slice(MAILTO.length).split('?')
    return z.email().safeParse(address).success
  }
  if (value.startsWith(TEL)) return TEL_PATTERN.test(value.slice(TEL.length))
  return httpUrl().safeParse(value).success
}

const text = (max: number) => z.string().trim().max(max)
const ctaHref = z.string().trim().max(MAX_CTA_HREF).refine(isValidCtaHref, CTA_HREF_MESSAGE)
const phone = z.string().trim().regex(TEL_PATTERN, TEL_MESSAGE).or(z.literal(''))
const email = z.email().or(z.literal(''))

// Fields without defaults: the base of the patch schema, so an omitted field stays omitted.
const fields = {
  slug: slugSchema,
  title: requiredText(200),
  summary: text(400),
  body: text(20000),
  imageId: idSchema.nullable(),
  ctaLabel: requiredText(60),
  ctaHref,
  contactName: text(120),
  contactPhone: phone,
  contactEmail: email,
}

export const serviceInputSchema = z.object({
  slug: fields.slug,
  title: fields.title,
  summary: fields.summary.default(''),
  body: fields.body.default(''),
  imageId: fields.imageId.default(null),
  ctaLabel: fields.ctaLabel.default('Enquire →'),
  ctaHref: fields.ctaHref.default(''),
  contactName: fields.contactName.default(''),
  contactPhone: fields.contactPhone.default(''),
  contactEmail: fields.contactEmail.default(''),
  isPublished: z.boolean().default(false),
})

// Publish state and order have their own endpoints, so PATCH never carries them.
export const servicePatchSchema = z.object(fields).partial()

export type ServiceInput = z.infer<typeof serviceInputSchema>
export type ServicePatch = z.infer<typeof servicePatchSchema>
