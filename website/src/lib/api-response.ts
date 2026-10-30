import { ApiInputError, PUBLIC_HEADERS } from './public-api'
export function publicJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: PUBLIC_HEADERS })
}
export function publicError(error: unknown) {
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
