import { FILTER_PARAMS, parseSearchParams } from '#lib/filter-constants'

export const API_VERSION = '1.0.0'
export const PUBLIC_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  'X-Content-Type-Options': 'nosniff',
}
export class ApiInputError extends Error {}

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

export const COVERAGE_NOTES = [
  'Budget citations describe recorded programme-budget references, not legal in-force status.',
  'Missing extracted text does not establish that the original document contains no relevant provisions.',
  'Resolution collections are related documents, not necessarily ordered versions or legal replacements.',
  'Citation context is the selected budget cycle. Extraction and relationship coverage may be incomplete.',
]
