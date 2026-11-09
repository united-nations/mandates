import {
  FILTER_PARAMS,
  filterValueMaxLength,
  parseSearchParams,
} from '#lib/filter-constants'
import {
  API_PAGE_MAX,
  API_PAGE_SIZE_MAX,
  EXPORT_ROW_CAP,
} from '#lib/api-limits'
import type { RefusalRule } from '#lib/api-refusal-log'
import type { BudgetRefusal } from '#lib/api-row-budget'

export const API_VERSION = '1.0.0'
export const PUBLIC_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  'X-Content-Type-Options': 'nosniff',
}
export class ApiInputError extends Error {}

/**
 * A request refused by one of the API's limit rules; logged as a refusal.
 * 400 for a request that can never succeed as asked, 429 (with Retry-After)
 * for one that exceeds an allowance that will reset.
 */
export class ApiLimitError extends ApiInputError {
  readonly rule: RefusalRule
  readonly values: Record<string, number | string>
  readonly status: 400 | 429
  readonly retryAfterSeconds?: number
  constructor(
    message: string,
    rule: RefusalRule,
    values: Record<string, number | string>,
    retry?: { retryAfterSeconds: number }
  ) {
    super(message)
    this.rule = rule
    this.values = values
    this.status = retry ? 429 : 400
    this.retryAfterSeconds = retry?.retryAfterSeconds
  }
}

function singleParameter(params: URLSearchParams, key: string) {
  if (params.getAll(key).length > 1)
    throw new ApiInputError(`Repeat parameters are not supported: ${key}`)
  return params.get(key)?.trim() || undefined
}

export function publicAgendaQuery(params: URLSearchParams) {
  const body = singleParameter(params, 'body') ?? 'GA'
  if (body !== 'GA' && body !== 'SC' && body !== 'ECOSOC' && body !== 'HRC')
    throw new ApiInputError('Unknown body; use GA, SC, ECOSOC or HRC')
  const session = singleParameter(params, 'session')
  if (session && !/^\d{1,4}$/.test(session))
    throw new ApiInputError('Invalid session')
  return { body, session } as const
}

export function publicProgrammeQuery(params: URLSearchParams) {
  if (params.has('ppb_version'))
    throw new ApiInputError(
      'This endpoint serves the latest budget cycle only; omit ppb_version.'
    )
}

export function publicQuery(params: URLSearchParams) {
  for (const key of FILTER_PARAMS) {
    if (params.getAll(key).length > 1)
      throw new ApiInputError(`Repeat parameters are not supported: ${key}`)
    // The shared parser ignores over-long values, which would widen the
    // query to more documents than the caller asked about.
    const value = params.get(key)
    if (value !== null && value.length > filterValueMaxLength(key))
      throw new ApiInputError(`${key} is too long`)
  }
  for (const key of [
    'page',
    'limit',
    'start_year',
    'end_year',
    'min_citations',
    'max_citations',
  ]) {
    const value = params.get(key)
    if (
      value !== null &&
      (!/^\d+$/.test(value) ||
        !Number.isSafeInteger(Number(value)) ||
        Number(value) < (key === 'page' || key === 'limit' ? 1 : 0))
    ) {
      throw new ApiInputError(`Invalid ${key}`)
    }
  }
  if (
    params.has('keyword') &&
    (params.get('keyword')!.length > 500 ||
      params.get('keyword')!.split(/\s+/).length > 32)
  )
    throw new ApiInputError('Search query is too long')
  for (const key of [
    'start_year',
    'end_year',
    'min_citations',
    'max_citations',
  ]) {
    const value = params.get(key)
    const max = key.endsWith('year') ? 9999 : 1_000_000
    if (value !== null && Number(value) > max)
      throw new ApiInputError(`Invalid ${key}`)
  }
  const filters = parseSearchParams(Object.fromEntries(params))
  const page = Number(params.get('page') ?? 1)
  const limit = Number(filters.limit)
  if (!Number.isSafeInteger((page - 1) * limit))
    throw new ApiInputError('Invalid page')
  return { filters, page, limit }
}

/**
 * Query for GET /api/v1/documents: the shared filters plus the API's own
 * paging limits. These are refusals, not clamps; the website's table pages
 * through normalizePagination and is not affected.
 */
export function publicPageQuery(params: URLSearchParams) {
  const query = publicQuery(params)
  if (params.has('include'))
    throw new ApiInputError('The include parameter is not accepted')
  const limit = params.get('limit')
  if (limit !== null && Number(limit) > API_PAGE_SIZE_MAX)
    throw new ApiLimitError(
      `limit must be ${API_PAGE_SIZE_MAX} or less`,
      'page_size',
      { limit: Number(limit) }
    )
  if (query.page > API_PAGE_MAX)
    throw new ApiLimitError(
      `page must be ${API_PAGE_MAX} or less; narrow the filters to reach other documents`,
      'page_depth',
      { page: query.page }
    )
  return query
}

export const EXPORT_FORMATS = ['csv', 'xlsx', 'json'] as const
export type ExportFormat = (typeof EXPORT_FORMATS)[number]

/** Query for GET /api/v1/exports. Exports carry document summaries only. */
export function publicExportQuery(params: URLSearchParams) {
  const { filters } = publicQuery(params)
  if (params.has('include'))
    throw new ApiLimitError(
      'The include parameter is not accepted on exports',
      'export_details',
      { include: params.get('include')! }
    )
  const format = params.get('format') ?? 'csv'
  if (!EXPORT_FORMATS.includes(format as ExportFormat))
    throw new ApiInputError('Unknown export format')
  return { filters, format: format as ExportFormat }
}

/**
 * Refuse an export whose selection is over the cap. The count decides: rows
 * added while the file streams are still written, so a file is never cut
 * short.
 */
export function assertExportWithinCap(total: number) {
  if (total > EXPORT_ROW_CAP)
    throw new ApiLimitError(
      `This export would contain ${total} documents; the limit is ${EXPORT_ROW_CAP}. Narrow the filters and try again.`,
      'export_cap',
      { total, cap: EXPORT_ROW_CAP }
    )
}

const plural = (n: number, word: string) =>
  `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`

/** The 429 for a request beyond the client's daily row or export allowance. */
export function budgetError(
  refusal: BudgetRefusal,
  request: { kind: 'search' | 'document' | 'export'; rows: number }
): ApiLimitError {
  const message =
    refusal.rule === 'export_allowance'
      ? 'Daily download limit reached. Please try again after 00:00 UTC.'
      : refusal.remaining === 0
        ? 'Daily row limit reached. Please try again after 00:00 UTC.'
        : request.kind === 'export'
          ? `This download has ${plural(request.rows, 'document')}, and ${plural(refusal.remaining, 'row')} remain today. Narrow the filters, or try again after 00:00 UTC.`
          : 'Daily row limit reached for a request of this size. Use a smaller limit, or try again after 00:00 UTC.'
  return new ApiLimitError(
    message,
    refusal.rule,
    { remaining: refusal.remaining, requested: request.rows },
    { retryAfterSeconds: refusal.retryAfterSeconds }
  )
}

export const COVERAGE_NOTES = [
  'Budget citations describe recorded programme-budget references, not legal in-force status.',
  'Document texts are not served by this API; use the UN Digital Library for them.',
  'A series groups related documents; it is not necessarily ordered and does not indicate legal replacement.',
  'Citation context is the selected budget cycle. Coverage may be incomplete.',
]
