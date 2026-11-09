/**
 * Structured stdout records of requests refused by a limit rule: one JSON
 * object per line, always the same keys. Client addresses are truncated.
 */
import type { ApiClient } from '#lib/api-client'

export const REFUSAL_EVENT = 'api_request_refused'
export const UNIDENTIFIED_CLIENT_EVENT = 'api_client_unidentified'

export type RefusalRule =
  | 'page_size'
  | 'page_depth'
  | 'export_cap'
  | 'export_details'
  | 'export_concurrency'
  | 'rate_per_minute'
  | 'rate_per_day'
  | 'row_budget'
  | 'export_allowance'
  | 'page_per_hour'
  | 'page_per_day'

export interface Refusal {
  route: string
  rule: RefusalRule
  status: 400 | 429
  client: ApiClient
  /** The values the rule was applied to, e.g. the requested page or export total. */
  values: Record<string, number | string>
}

export function refusalLine(refusal: Refusal, now: Date): string {
  return JSON.stringify({
    event: REFUSAL_EVENT,
    timestamp: now.toISOString(),
    status: refusal.status,
    route: refusal.route,
    rule: refusal.rule,
    client: refusal.client.truncated,
    values: refusal.values,
  })
}

const writeLine = (line: string) => process.stdout.write(line + '\n')

export function logRefusal(refusal: Refusal): void {
  writeLine(refusalLine(refusal, new Date()))
}

/** A request whose client could not be determined. The header is not logged. */
export function logUnidentifiedClient(
  route: string,
  forwardedFor: string | null
): void {
  writeLine(
    JSON.stringify({
      event: UNIDENTIFIED_CLIENT_EVENT,
      timestamp: new Date().toISOString(),
      route,
      forwardedFor: forwardedFor === null ? 'absent' : 'unparsed',
    })
  )
}
