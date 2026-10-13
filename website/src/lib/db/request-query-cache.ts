/**
 * @file Request-local database read memoization
 * @description Shares identical in-flight reads within one async request scope.
 *
 * Key exports:
 * - withRequestQueryCache() - Creates an isolated cache scope.
 * - readRequestQueryCache() - Reuses one promise by deterministic query key.
 */

import { AsyncLocalStorage } from 'node:async_hooks'

type QueryPromise = Promise<unknown>

const storage = new AsyncLocalStorage<Map<string, QueryPromise>>()

/** Builds a deterministic key from parameterized SQL and its bound values. */
export const requestQueryKey = (text: string, params?: unknown[]): string =>
  JSON.stringify([text, params ?? []])

/** Runs an operation with a fresh, isolated database-read cache. */
export const withRequestQueryCache = <T>(operation: () => Promise<T>) =>
  storage.run(new Map(), operation)

/** Returns the one in-flight or completed read for a key in this request. */
export const readRequestQueryCache = <T>(
  key: string,
  load: () => Promise<T>
): Promise<T> => {
  const cache = storage.getStore()
  if (!cache) return load()
  const existing = cache.get(key)
  if (existing) return existing as Promise<T>
  const pending = load()
  cache.set(key, pending)
  return pending
}
