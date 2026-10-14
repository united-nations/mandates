/** Refuse remote database connections that do not verify the server identity. */
export function verifiedDatabaseUrl(value: string | undefined): string {
  const message =
    'DATABASE_URL must use PostgreSQL with exactly one sslmode=verify-full and no conflicting SSL options'
  if (!value) throw new Error(message)
  let url: URL
  try {
    url = new URL(value)
  } catch {
    // Never include a credential-bearing URL in an error message.
    throw new Error(message)
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    url.searchParams.getAll('sslmode').length !== 1 ||
    url.searchParams.get('sslmode') !== 'verify-full' ||
    url.searchParams.has('ssl') ||
    url.searchParams.has('uselibpqcompat')
  )
    throw new Error(message)
  return value
}
