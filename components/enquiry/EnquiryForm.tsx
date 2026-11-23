'use client'

import { useEffect, useRef, type ChangeEvent } from 'react'
import { PRIMARY_BUTTON_CLASS, PRIMARY_BUTTON_ELEMENT_CLASS } from '@/components/site/PrimaryButton'
import {
  ENQUIRY_EMAIL_MAX, ENQUIRY_MESSAGE_MAX, ENQUIRY_MOBILE_MAX, ENQUIRY_NAME_MAX, ENQUIRY_PURPOSE_MAX, todayInKolkata,
} from '@/lib/shared'
import { CONTROL_CLASS, DATE_CONTROL_CLASS, ERROR_CLASS, READONLY_CLASS, TEXTAREA_CLASS } from './fieldStyles'
import { FormField, fieldId } from './FormField'
import { useEnquiryForm, type EnquiryTarget, type FieldName } from './useEnquiryForm'

const THANKS = 'Thank you. We have your enquiry and will be in touch soon.'
const ISO_DATE_LENGTH = 10
const SUBMIT_CLASS = `${PRIMARY_BUTTON_CLASS} ${PRIMARY_BUTTON_ELEMENT_CLASS} disabled:cursor-default disabled:opacity-60`

type Change = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>

function Chevron() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 12 8" width="12" height="8" className="pointer-events-none absolute right-1 bottom-[18px] text-ink">
      <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/** Shown in place of the form once the enquiry is stored; takes focus so the change is announced and reachable. */
export function Confirmation({ children = THANKS }: { children?: string }) {
  const message = useRef<HTMLParagraphElement>(null)
  useEffect(() => message.current?.focus(), [])
  return (
    <p ref={message} role="status" tabIndex={-1} className="m-0 font-display text-[clamp(24px,2.4vw,32px)] leading-[1.3] text-pretty outline-none">
      {children}
    </p>
  )
}

/** The enquiry form for a service (dates, purpose, location) or an artist (fixed artist field). */
export function EnquiryForm({ target }: { target: EnquiryTarget }) {
  const { values, errors, formError, status, formRef, setValue, submit } = useEnquiryForm(target)
  if (status === 'sent') return <Confirmation />

  const bind = (name: FieldName) => ({
    name,
    value: values[name],
    onChange: (event: Change) => setValue(name, event.target.value),
  })
  const today = todayInKolkata().toISOString().slice(0, ISO_DATE_LENGTH)

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-6">
      {target.kind === 'ARTIST' && (
        <FormField name="artist" label="Artist">
          {(aria) => <input {...aria} type="text" readOnly aria-readonly="true" value={target.name} className={READONLY_CLASS} />}
        </FormField>
      )}
      <FormField name="name" label="Name" error={errors.name}>
        {(aria) => <input {...aria} {...bind('name')} type="text" data-autofocus required autoComplete="name" maxLength={ENQUIRY_NAME_MAX} className={CONTROL_CLASS} />}
      </FormField>
      <FormField name="mobile" label="Mobile" error={errors.mobile}>
        {(aria) => <input {...aria} {...bind('mobile')} type="tel" inputMode="tel" required autoComplete="tel" maxLength={ENQUIRY_MOBILE_MAX} className={CONTROL_CLASS} />}
      </FormField>
      <FormField name="email" label="Email" error={errors.email}>
        {(aria) => <input {...aria} {...bind('email')} type="email" required autoComplete="email" maxLength={ENQUIRY_EMAIL_MAX} className={CONTROL_CLASS} />}
      </FormField>
      {target.kind === 'SERVICE' && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField name="dateFrom" label="Date from" error={errors.dateFrom}>
              {(aria) => <input {...aria} {...bind('dateFrom')} type="date" required min={today} className={DATE_CONTROL_CLASS} />}
            </FormField>
            <FormField name="dateTo" label="Date to" error={errors.dateTo}>
              {(aria) => <input {...aria} {...bind('dateTo')} type="date" required min={values.dateFrom || today} className={DATE_CONTROL_CLASS} />}
            </FormField>
          </div>
          <FormField name="purpose" label="Purpose" error={errors.purpose}>
            {(aria) => <input {...aria} {...bind('purpose')} type="text" required maxLength={ENQUIRY_PURPOSE_MAX} className={CONTROL_CLASS} />}
          </FormField>
          <FormField name="location" label="Location" error={errors.location} className="relative">
            {(aria) => (
              <>
                <select {...aria} {...bind('location')} required className={`${CONTROL_CLASS} pr-8`}>
                  <option value="">Select</option>
                  {target.locations.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <Chevron />
              </>
            )}
          </FormField>
        </>
      )}
      <FormField name="message" label="Message" optional error={errors.message}>
        {(aria) => <textarea {...aria} {...bind('message')} rows={4} maxLength={ENQUIRY_MESSAGE_MAX} className={TEXTAREA_CLASS} />}
      </FormField>
      {/* Honeypot: invisible and unreachable for people; only a bot fills it. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor={fieldId('refCode')}>Leave this field empty</label>
        <input id={fieldId('refCode')} {...bind('refCode')} type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {formError && (
        <p role="alert" className={ERROR_CLASS}>
          {formError}
        </p>
      )}
      <button type="submit" disabled={status === 'sending'} className={SUBMIT_CLASS}>
        {status === 'sending' ? 'Sending…' : 'Send enquiry'}
      </button>
    </form>
  )
}
