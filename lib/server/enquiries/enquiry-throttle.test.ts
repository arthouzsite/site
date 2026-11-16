import { describe, expect, it } from 'vitest'
import { ENQUIRY_SITEWIDE_THROTTLE, ENQUIRY_THROTTLE } from './enquiries.constants'
import { enquiryThrottleFor, throttleAddress } from './enquiry-throttle'

describe('throttleAddress', () => {
  it('leaves IPv4 addresses as they are', () => {
    expect(throttleAddress('203.0.113.9')).toBe('203.0.113.9')
  })

  it('reduces IPv6 to its /64 prefix, whatever the spelling', () => {
    const expected = '2001:db8:1:2::/64'
    for (const ip of ['2001:db8:1:2::1', '2001:0db8:0001:0002:aaaa:bbbb:cccc:dddd', '2001:DB8:1:2:0:0:0:ff', '2001:db8:1:2::', '2001:db8:1:2:3:4:5:6%eth0']) {
      expect(throttleAddress(ip)).toBe(expected)
    }
  })

  it('separates different /64s and expands a leading ::', () => {
    expect(throttleAddress('2001:db8:1:3::1')).not.toBe(throttleAddress('2001:db8:1:2::1'))
    expect(throttleAddress('::1')).toBe('0:0:0:0::/64')
  })

  it('treats an IPv4-mapped IPv6 address as the IPv4 address', () => {
    expect(throttleAddress('::ffff:203.0.113.9')).toBe('203.0.113.9')
  })

  it('bounds the length of anything that is not an address', () => {
    expect(throttleAddress('x'.repeat(500))).toHaveLength(64)
  })
})

describe('enquiryThrottleFor', () => {
  it('uses the per-address limit for a known address and the namespaced key', () => {
    expect(enquiryThrottleFor('203.0.113.9')).toEqual({ key: 'enquiry:203.0.113.9', rule: ENQUIRY_THROTTLE })
    expect(enquiryThrottleFor('2001:db8:1:2::7').key).toBe('enquiry:2001:db8:1:2::/64')
  })

  it('uses the much higher site-wide cap when the address is unknown', () => {
    expect(enquiryThrottleFor('unknown')).toEqual({ key: 'enquiry:unknown', rule: ENQUIRY_SITEWIDE_THROTTLE })
    expect(ENQUIRY_SITEWIDE_THROTTLE.limit).toBe(60)
  })
})
