type OverrideEnv = {
  readonly NODE_ENV?: string
  /** `next start` always runs with NODE_ENV=production; test harnesses opt in explicitly. Never set in deployments. */
  readonly ALLOW_TEST_OVERRIDES?: string
}

/** Whether test-only overrides (frozen date, picsum images, localhost origin) apply: always outside production, opt-in inside it. */
export function allowsTestOverrides(env: OverrideEnv): boolean {
  return env.NODE_ENV !== 'production' || env.ALLOW_TEST_OVERRIDES === '1'
}
