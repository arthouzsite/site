/* eslint-disable @next/next/no-img-element -- The challenge is an inline SVG data URI drawn per request; next/image has nothing to optimise. */
'use client'

import type { ChangeEvent } from 'react'
import { Confirmation } from '@/components/enquiry/EnquiryForm'
import { CONTROL_CLASS, ERROR_CLASS } from '@/components/enquiry/fieldStyles'
import { FormField, fieldId } from '@/components/enquiry/FormField'
import { useEnquiryForm, type EnquiryTarget, type FieldName } from '@/components/enquiry/useEnquiryForm'
import { PRIMARY_BUTTON_CLASS, PRIMARY_BUTTON_ELEMENT_CLASS } from '@/components/site/PrimaryButton'
import { ENQUIRY_CAPTCHA_MAX, ENQUIRY_EMAIL_MAX, ENQUIRY_MOBILE_MAX, ENQUIRY_NAME_MAX } from '@/lib/shared'
import { useCaptcha } from './useCaptcha'

const THANKS = 'Thank you. Our team will contact you shortly about this print.'
const CAPTCHA_UNAVAILABLE = 'The security code could not load.'
const CAPTCHA_WIDTH = 220
const CAPTCHA_HEIGHT = 72
const SUBMIT_CLASS = `${PRIMARY_BUTTON_CLASS} ${PRIMARY_BUTTON_ELEMENT_CLASS} disabled:cursor-default disabled:opacity-60`
const NEW_CODE_CLASS =
  'm-0 min-h-11 cursor-pointer appearance-none rounded-none border-0 bg-transparent p-0 [font-family:inherit] text-[12px] tracking-[0.16em] text-ink uppercase underline underline-offset-4 hover:text-muted'

const svgDataUri = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

type PrintTarget = Extract<EnquiryTarget, { kind: 'PRINT' }>

/** Order request for one print: who to contact, and a picture challenge that keeps scripts out. */
export function PrintOrderForm({ target }: { target: PrintTarget }) {
  const { captcha, isUnavailable, refresh } = useCaptcha()
  const { values, errors, formError, status, formRef, setValue, submit } = useEnquiryForm(target, { captchaToken: captcha?.token, onRejected: refresh })
  if (status === 'sent') return <Confirmation>{THANKS}</Confirmation>

  const bind = (name: FieldName) => ({
    name,
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement>) => setValue(name, event.target.value),
  })
  const newCode = () => {
    setValue('captcha', '')
    refresh()
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-6">
      <FormField name="name" label="Name" error={errors.name}>
        {(aria) => <input {...aria} {...bind('name')} type="text" data-autofocus required autoComplete="name" maxLength={ENQUIRY_NAME_MAX} className={CONTROL_CLASS} />}
      </FormField>
      <FormField name="email" label="Email" error={errors.email}>
        {(aria) => <input {...aria} {...bind('email')} type="email" required autoComplete="email" maxLength={ENQUIRY_EMAIL_MAX} className={CONTROL_CLASS} />}
      </FormField>
      <FormField name="mobile" label="Mobile number" error={errors.mobile}>
        {(aria) => <input {...aria} {...bind('mobile')} type="tel" inputMode="tel" required autoComplete="tel" maxLength={ENQUIRY_MOBILE_MAX} className={CONTROL_CLASS} />}
      </FormField>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center justify-center border border-solid border-line-30 bg-paper" style={{ width: CAPTCHA_WIDTH, height: CAPTCHA_HEIGHT, maxWidth: '100%' }}>
            {captcha && <img src={svgDataUri(captcha.image)} alt="Security code" width={CAPTCHA_WIDTH} height={CAPTCHA_HEIGHT} className="block h-full w-full" />}
            {!captcha && isUnavailable && (
              <span role="alert" className="px-3 text-[13px] leading-[1.3] text-danger">
                {CAPTCHA_UNAVAILABLE}
              </span>
            )}
          </div>
          <button type="button" onClick={newCode} className={NEW_CODE_CLASS}>
            New code
          </button>
        </div>
        <FormField name="captcha" label="Security code" error={errors.captcha}>
          {(aria) => (
            <input {...aria} {...bind('captcha')} type="text" required autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={ENQUIRY_CAPTCHA_MAX} className={`${CONTROL_CLASS} tracking-[0.2em] uppercase`} />
          )}
        </FormField>
      </div>
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
      <button type="submit" disabled={status === 'sending' || !captcha} className={SUBMIT_CLASS}>
        {status === 'sending' ? 'Sending…' : 'Place order request'}
      </button>
    </form>
  )
}
