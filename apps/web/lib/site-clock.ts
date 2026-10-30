const ISO_DATE = /^(\d{4})-\d{2}-\d{2}$/

type ClockEnv = {
  readonly NODE_ENV?: string
  readonly TODAY_OVERRIDE?: string
  /** `next start` always runs with NODE_ENV=production; the visual harness opts in explicitly. Never set in deployments. */
  readonly ALLOW_TODAY_OVERRIDE?: string
}

function overrideAllowed(env: ClockEnv): boolean {
  return env.NODE_ENV !== 'production' || env.ALLOW_TODAY_OVERRIDE === '1'
}

/** Current year; honours TODAY_OVERRIDE (YYYY-MM-DD) outside production, as the API does. */
export function currentYear(now: Date = new Date(), env: ClockEnv = process.env): number {
  const override = overrideAllowed(env) ? env.TODAY_OVERRIDE : undefined
  const match = override ? ISO_DATE.exec(override) : null
  return match ? Number(match[1]) : now.getFullYear()
}
