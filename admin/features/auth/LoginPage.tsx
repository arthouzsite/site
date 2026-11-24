import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { BrandLogo } from '../../components/BrandLogo'
import { Button } from '../../components/ui/Button'
import { ErrorSummary, type SummaryError } from '../../components/ui/ErrorSummary'
import { Field } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { api, ApiError } from '../../lib/api'
import { useZodForm } from '../../lib/useZodForm'
import { CaptchaChallenge, useCaptcha } from './CaptchaChallenge'
import { PasswordInput } from './PasswordInput'
import { SESSION_KEY, type SessionUser } from './useSession'

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email address').pipe(z.email('Enter a valid email address')),
  password: z.string().min(1, 'Enter your password'),
  captchaAnswer: z.string().trim().min(1, 'Enter the security code'),
})

const BAD_CREDENTIALS = 'Email or password is incorrect'
const CAPTCHA_INVALID = 'CAPTCHA_INVALID'
const CAPTCHA_UNAVAILABLE = 'The security code could not load. Show a different code and try again.'
const RATE_LIMITED = 'Too many attempts. Try again in a minute.'

/** Only same-origin paths are honoured, so `?next=` cannot bounce a user to another site. */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const client = useQueryClient()
  const [params] = useSearchParams()
  const [rateLimited, setRateLimited] = useState(false)
  const captcha = useCaptcha()
  const form = useZodForm(schema, { email: '', password: '', captchaAnswer: '' })
  const { register, handleSubmit, formState, applyServerErrors, resetField, setError } = form
  const { errors, isSubmitting, submitCount } = formState

  const summary: SummaryError[] = [
    errors.email?.message ? { name: 'email', message: errors.email.message } : null,
    errors.password?.message ? { name: 'password', message: errors.password.message } : null,
    errors.captchaAnswer?.message ? { name: 'captchaAnswer', message: errors.captchaAnswer.message } : null,
    // A wrong code is already listed against its own field.
    errors.root?.server?.message && errors.root.server.type !== CAPTCHA_INVALID ? { name: 'email', message: errors.root.server.message } : null,
  ].filter((e): e is SummaryError => e !== null)

  /** Every challenge is for one attempt: after a failure the old code is cleared and a new picture is drawn. */
  const newCaptcha = () => {
    resetField('captchaAnswer')
    void captcha.refetch()
  }

  const onSubmit = handleSubmit(async (values) => {
    setRateLimited(false)
    // A submit can arrive before the first challenge has loaded; wait for it instead of failing the attempt.
    const challenge = captcha.data ?? (await captcha.refetch()).data
    if (!challenge) return setError('captchaAnswer', { type: 'server', message: CAPTCHA_UNAVAILABLE })
    try {
      const result = await api.post<{ user: SessionUser } | SessionUser>('/auth/login', { ...values, captchaToken: challenge.token })
      const user: SessionUser = 'user' in result ? result.user : result
      client.setQueryData(SESSION_KEY, user)
      navigate(safeNext(params.get('next')), { replace: true })
    } catch (err) {
      newCaptcha()
      if (err instanceof ApiError && err.status === 429) return setRateLimited(true)
      if (err instanceof ApiError && err.status === 401) {
        return applyServerErrors(new ApiError(401, { code: err.code, message: BAD_CREDENTIALS }))
      }
      applyServerErrors(err)
    }
  })

  return (
    <div className="grid min-h-screen grid-cols-2 max-[880px]:grid-cols-1">
      <section aria-label="Art Houz" className="flex flex-col justify-between bg-ink p-12 text-paper max-[880px]:min-h-[220px]">
        <BrandLogo variant="full" alt="Art Houz" className="h-16 self-start" />
        <p className="m-0 max-w-[14em] font-display text-[clamp(32px,4vw,56px)] leading-[1.05]">
          Contemporary art from South India. Chennai &amp; Bengaluru, since 2012.
        </p>
        <p className="m-0 text-13 text-on-dark-muted">Art Houz CMS</p>
      </section>
      <main className="grid place-items-center px-6 py-12">
        <form onSubmit={onSubmit} noValidate className="flex w-[min(400px,100%)] flex-col gap-[22px]">
          <h1 className="m-0 font-display text-40 font-normal leading-none">Sign in</h1>
          <ErrorSummary errors={summary} focusKey={submitCount} />
          <Field name="email" label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="username" {...register('email')} />
          </Field>
          <Field name="password" label="Password" error={errors.password?.message}>
            <PasswordInput autoComplete="current-password" {...register('password')} />
          </Field>
          <div className="flex flex-col gap-2.5">
            <CaptchaChallenge captcha={captcha.data} isUnavailable={captcha.isError} onRefresh={newCaptcha} />
            <Field name="captchaAnswer" label="Security code" error={errors.captchaAnswer?.message}>
              <Input autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={12} className="uppercase tracking-eyebrow" {...register('captchaAnswer')} />
            </Field>
          </div>
          <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">Sign in</Button>
          <div className="flex flex-col gap-1.5">
            {rateLimited && (
              <p role="status" className="m-0 flex items-center gap-1.5 text-12 text-danger">
                <Icon name="clock" />
                {RATE_LIMITED}
              </p>
            )}
            <p className="m-0 text-12 text-muted">Access is by invitation. Ask an administrator.</p>
          </div>
        </form>
      </main>
    </div>
  )
}
