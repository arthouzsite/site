import { describe, expect, test } from 'vitest'
import { PHONE_MESSAGE, NAME_MESSAGE, locationInputSchema, userInputSchema } from '../index'

describe('location phone (FIN-3500)', () => {
  test.each(['98861 12400', '+91 98861-12400', '(044) 2345 6789', '044-2345-6789', ''])('accepts %j', (phone) => {
    expect(locationInputSchema.safeParse({ city: 'Chennai', phone }).success).toBe(true)
  })

  test.each(['wertyuiytrertyui', '9886 call me', '98861@12400'])('rejects %j with the phone message', (phone) => {
    const result = locationInputSchema.safeParse({ city: 'Chennai', phone })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((i) => i.message)).toContain(PHONE_MESSAGE)
  })
})

describe('user name (FIN-3483)', () => {
  const base = { email: 'someone@arthouz.test', role: 'EDITOR' as const }

  test.each(["Mary-Jane O'Neil Jr.", 'A. V. Ilango', 'Priya Raman'])('accepts %j', (name) => {
    expect(userInputSchema.safeParse({ ...base, name }).success).toBe(true)
  })

  test.each(['55454665', 'John 2', 'R2D2'])('rejects %j with the name message', (name) => {
    const result = userInputSchema.safeParse({ ...base, name })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((i) => i.message)).toContain(NAME_MESSAGE)
  })
})
