import { isIPv4, isIPv6 } from 'node:net'
import { UNKNOWN_IP } from '@/lib/server/auth/client-ip'
import type { ThrottleRule } from '@/lib/server/common/throttle'
import { ENQUIRY_SITEWIDE_THROTTLE, ENQUIRY_THROTTLE, ENQUIRY_THROTTLE_KEY_PREFIX } from './enquiries.constants'

const IPV6_GROUPS = 8
const IPV6_PREFIX_GROUPS = 4
const MAX_KEY_ADDRESS_LENGTH = 64
const MAPPED_V4_PREFIX = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i

/** The two 16-bit groups an embedded dotted IPv4 tail stands for, as hex. */
function v4Groups(address: string): string[] {
  const [a = 0, b = 0, c = 0, d = 0] = address.split('.').map(Number)
  return [((a << 8) | b).toString(16), ((c << 8) | d).toString(16)]
}

function expandIPv6(address: string): string[] {
  const [head = '', tail] = address.split('::')
  const groupsOf = (part: string): string[] =>
    part === '' ? [] : part.split(':').flatMap((group) => (group.includes('.') ? v4Groups(group) : [group]))
  const front = groupsOf(head)
  const back = tail === undefined ? [] : groupsOf(tail)
  const fill = tail === undefined ? [] : Array<string>(IPV6_GROUPS - front.length - back.length).fill('0')
  return [...front, ...fill, ...back]
}

/** Addresses of one IPv6 /64 (a single subscriber's allocation) must share a bucket, so only the prefix counts. */
export function throttleAddress(ip: string): string {
  const address = ip.split('%')[0]?.trim() ?? ''
  const mapped = MAPPED_V4_PREFIX.exec(address)?.[1]
  if (mapped && isIPv4(mapped)) return mapped
  if (!isIPv6(address)) return address.slice(0, MAX_KEY_ADDRESS_LENGTH)
  const prefix = expandIPv6(address).slice(0, IPV6_PREFIX_GROUPS).map((group) => parseInt(group, 16).toString(16))
  return `${prefix.join(':')}::/64`
}

/** Which counter and limit apply to a submitter: a per-address bucket, or the site-wide cap when the address is unknown. */
export function enquiryThrottleFor(ip: string): { key: string; rule: ThrottleRule } {
  if (ip === UNKNOWN_IP) return { key: `${ENQUIRY_THROTTLE_KEY_PREFIX}${UNKNOWN_IP}`, rule: ENQUIRY_SITEWIDE_THROTTLE }
  return { key: `${ENQUIRY_THROTTLE_KEY_PREFIX}${throttleAddress(ip)}`, rule: ENQUIRY_THROTTLE }
}
