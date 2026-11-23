'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApiEnvelope } from '@/lib/shared'

const ENDPOINT = '/api/auth/captcha'

export type Captcha = { token: string; image: string }

async function fetchCaptcha(): Promise<Captcha> {
  const response = await fetch(ENDPOINT, { cache: 'no-store' })
  const envelope = (await response.json()) as ApiEnvelope<Captcha>
  if (!response.ok || !envelope.data) throw new Error(`Security code request failed with HTTP ${response.status}`)
  return envelope.data
}

/** One picture challenge for a form: loaded when the form opens, replaced only when asked. */
export function useCaptcha() {
  const [captcha, setCaptcha] = useState<Captcha | null>(null)
  const [isUnavailable, setIsUnavailable] = useState(false)
  // Only the latest request may settle the state, so a slow earlier answer cannot replace a newer picture.
  const latest = useRef(0)

  const load = useCallback(() => {
    const request = ++latest.current
    const isLatest = () => request === latest.current
    fetchCaptcha().then(
      (next) => isLatest() && setCaptcha(next),
      () => isLatest() && setIsUnavailable(true),
    )
  }, [])

  useEffect(() => load(), [load])

  const refresh = useCallback(() => {
    setCaptcha(null)
    setIsUnavailable(false)
    load()
  }, [load])

  return { captcha, isUnavailable, refresh }
}
