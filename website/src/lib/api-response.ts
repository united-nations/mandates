import { ApiInputError, ApiLimitError, PUBLIC_HEADERS } from './public-api'
import { apiClient } from './api-client'
import { logRefusal, type RefusalRule } from './api-refusal-log'

export function publicJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: PUBLIC_HEADERS })
}

export interface Refusal {
  status: 400 | 429
  rule: RefusalRule
  message: string
  values: Record<string, number | string>
  retryAfterSeconds?: number
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** A short page a person sees in the browser instead of a JSON error. */
export function refusalPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} | UN Mandate Registry</title>
<style>
body { font: 16px/1.5 system-ui, sans-serif; color: #1a1a1a; margin: 0; }
main { max-width: 36rem; margin: 15vh auto 0; padding: 0 1.5rem; }
h1 { font-size: 1.4rem; margin: 0 0 1rem; }
a { color: #0077a8; }
</style>
</head>
<body>
<main>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(message)}</p>
<p>Use your browser’s Back button to return, or go to the <a href="/">UN Mandate Registry</a>.</p>
</main>
</body>
</html>
`
}

/**
 * A refusal by one of the limit rules: logged, never cached, and with
 * Retry-After on a 429. A browser navigation (for example the website's
 * Download link) gets a readable page; other clients get JSON.
 */
export function refusalResponse(
  request: Request,
  refusal: Refusal,
  options: { html?: 'always' | 'when-navigating' } = {}
) {
  logRefusal({
    route: new URL(request.url).pathname,
    rule: refusal.rule,
    status: refusal.status,
    client: apiClient(request.headers.get('x-forwarded-for')),
    values: refusal.values,
  })
  const headers = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(refusal.retryAfterSeconds === undefined
      ? {}
      : { 'Retry-After': String(refusal.retryAfterSeconds) }),
  }
  const html =
    options.html === 'always' ||
    (options.html === 'when-navigating' &&
      (request.headers.get('accept') ?? '').includes('text/html'))
  if (html)
    return new Response(
      refusalPage(
        refusal.status === 429 ? 'Please try again later' : 'Not available',
        refusal.message
      ),
      {
        status: refusal.status,
        headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
      }
    )
  return Response.json(
    { error: refusal.message },
    { status: refusal.status, headers }
  )
}

export function publicError(
  error: unknown,
  request: Request,
  options: { html?: 'when-navigating' } = {}
) {
  if (error instanceof ApiLimitError)
    return refusalResponse(
      request,
      {
        status: error.status,
        rule: error.rule,
        message: error.message,
        values: error.values,
        retryAfterSeconds: error.retryAfterSeconds,
      },
      options
    )
  if (error instanceof ApiInputError)
    return publicJson({ error: error.message }, 400)
  console.error('Public data request failed', error)
  return Response.json(
    { error: 'Data is temporarily unavailable. Please retry.' },
    {
      status: 503,
      headers: {
        ...PUBLIC_HEADERS,
        'Cache-Control': 'no-store',
        'Retry-After': '30',
      },
    }
  )
}
