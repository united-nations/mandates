/**
 * Limits on the public API and the document pages. Requests beyond a limit
 * are refused (400 or 429). Single source for the routes, the proxy, the
 * Download menu, llms.txt and the OpenAPI description.
 */

/** Largest `limit` accepted by GET /api/v1/documents. */
export const API_PAGE_SIZE_MAX = 25
/** Deepest `page` accepted by GET /api/v1/documents. */
export const API_PAGE_MAX = 4
/** Most documents a single export may contain, in every format. */
export const EXPORT_ROW_CAP = 1000
/** Exports streaming at once. */
export const EXPORT_CONCURRENCY_MAX = 2
/** Retry-After, in seconds, when every export slot is busy. */
export const EXPORT_BUSY_RETRY_SECONDS = 10

/** API requests per client in any rolling 60-second window. */
export const RATE_LIMIT_PER_MINUTE = 20
/** API requests per client per UTC calendar day. */
export const RATE_LIMIT_PER_DAY = 200
/**
 * Rows the API delivers to one client per UTC calendar day: each document in
 * a search page, each single document (.json included), and each document in
 * an export.
 */
export const ROW_BUDGET_PER_DAY = 5000
/** Exports one client may download per UTC calendar day. */
export const EXPORTS_PER_DAY = 30

/** Document page (/mandate/{symbol}) requests per client. */
export const DOCUMENT_PAGES_PER_HOUR = 1000
export const DOCUMENT_PAGES_PER_DAY = 5000

export const DIGITAL_LIBRARY_URL = 'https://digitallibrary.un.org'

/** Fair-use statements shared by llms.txt and the OpenAPI description. */
export const API_FAIR_USE =
  'This service is for reading the registry and for occasional lookups.'
export const DIGITAL_LIBRARY_POINTER = `For document texts and bulk access, please use the UN Digital Library (${DIGITAL_LIBRARY_URL}).`

/** Rules a valid API request must meet, for the OpenAPI description. */
export const API_REQUEST_RULES = [
  `GET /api/v1/documents accepts limit up to ${API_PAGE_SIZE_MAX} and page up to ${API_PAGE_MAX}; larger values return 400.`,
  `A download (GET /api/v1/exports) contains at most ${EXPORT_ROW_CAP.toLocaleString('en-US')} documents. A larger selection returns 400 with its total; narrow the filters. The include parameter is not accepted on downloads (400).`,
  `Malformed, repeated or over-long query parameters, and unknown budget cycles, return 400. An unknown document returns 404.`,
]

/** How volume limits are described publicly, for llms.txt and the OpenAPI description. */
export const VOLUME_LIMITS =
  'Use is limited per client; when a limit is reached, the response is 429 with a Retry-After header saying when to try again.'
