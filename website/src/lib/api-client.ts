/** The client of a request, for rate limiting and the refusal log. */
import { isIPv4, isIPv6 } from 'node:net'

export const UNKNOWN_CLIENT = 'unknown-client'

export type ApiClient =
  | {
      kind: 'ipv4' | 'ipv6'
      /** Rate-limit key. */
      bucket: string
      /** Truncated form for logs. */
      truncated: string
    }
  | {
      kind: 'unknown'
      bucket: typeof UNKNOWN_CLIENT
      truncated: typeof UNKNOWN_CLIENT
    }

const UNKNOWN: ApiClient = {
  kind: 'unknown',
  bucket: UNKNOWN_CLIENT,
  truncated: UNKNOWN_CLIENT,
}

function withoutPort(entry: string): string {
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(entry)
  if (bracketed) return bracketed[1]
  const ipv4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(entry)
  if (ipv4WithPort) return ipv4WithPort[1]
  return entry
}

/** Eight lower-case hextets without leading zeros, from a valid IPv6 address. */
function ipv6Hextets(address: string): string[] {
  let text = address.toLowerCase()
  const lastColon = text.lastIndexOf(':')
  const tail = text.slice(lastColon + 1)
  if (tail.includes('.')) {
    // Embedded IPv4 tail, e.g. ::ffff:192.0.2.1
    const [a, b, c, d] = tail.split('.').map(Number)
    text = `${text.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`
  }
  const [head, rest] = text.split('::')
  const left = head ? head.split(':') : []
  const right = rest === undefined ? [] : rest ? rest.split(':') : []
  const hextets =
    rest === undefined
      ? left
      : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
  if (hextets.length !== 8)
    throw new Error(`IPv6 address did not expand to eight groups: ${address}`)
  return hextets.map((group) => parseInt(group, 16).toString(16))
}

/** The client of a request, from its X-Forwarded-For header. */
export function apiClient(forwardedFor: string | null): ApiClient {
  const entry = forwardedFor?.split(',').at(-1)?.trim()
  if (!entry) return UNKNOWN
  const address = withoutPort(entry)
  if (isIPv4(address)) {
    const [a, b, c] = address.split('.')
    return { kind: 'ipv4', bucket: address, truncated: `${a}.${b}.${c}.0/24` }
  }
  if (isIPv6(address)) {
    const hextets = ipv6Hextets(address)
    return {
      kind: 'ipv6',
      bucket: `${hextets.slice(0, 4).join(':')}::/64`,
      truncated: `${hextets.slice(0, 3).join(':')}::/48`,
    }
  }
  return UNKNOWN
}
