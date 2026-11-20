/* eslint-disable @next/next/no-img-element -- The challenge is an inline SVG data URI drawn per request; next/image has nothing to optimise. */
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { api } from '../../lib/api'

export type Captcha = { token: string; image: string }
export const CAPTCHA_KEY = ['captcha'] as const

/** One challenge per visit to the form; a new one only when asked, never on refocus, so the code does not change while it is being typed. */
export function useCaptcha() {
  return useQuery({
    queryKey: CAPTCHA_KEY,
    queryFn: () => api.get<Captcha>('/auth/captcha'),
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

const svgDataUri = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

type Props = { captcha: Captcha | undefined; isUnavailable: boolean; onRefresh: () => void }

/** The picture of the code and the control that swaps it for another one. */
export function CaptchaChallenge({ captcha, isUnavailable, onRefresh }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-[72px] w-[220px] max-w-full items-center justify-center border border-line bg-paper">
        {captcha && <img src={svgDataUri(captcha.image)} alt="Security code" width={220} height={72} className="block h-full w-full" />}
        {!captcha && isUnavailable && <span className="px-3 text-12 text-danger">The security code could not load.</span>}
      </div>
      <Button variant="ghost" iconOnly aria-label="Show a different code" onClick={onRefresh}>
        <Icon name="refresh" />
      </Button>
    </div>
  )
}
