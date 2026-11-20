/** The code every challenge uses in the browser harnesses, which cannot read the picture. */
export const TEST_CAPTCHA_CODE = 'ACE23'

/** Asks the running app for a challenge and answers it with the pinned code. */
export async function solvedCaptcha(origin: string): Promise<{ captchaToken: string; captchaAnswer: string }> {
  const response = await fetch(`${origin}/api/auth/captcha`)
  if (!response.ok) throw new Error(`captcha: challenge request failed with HTTP ${response.status}`)
  const { data } = (await response.json()) as { data: { token: string } }
  return { captchaToken: data.token, captchaAnswer: TEST_CAPTCHA_CODE }
}
