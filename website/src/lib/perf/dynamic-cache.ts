import { isDynamicCacheBypassed } from '#lib/perf/trace-context'

interface CacheOptions {
  revalidate: number
}

export const readDynamicCache = async <T>(
  load: () => Promise<T>,
  keyParts: string[],
  options: CacheOptions
): Promise<T> => {
  if (isDynamicCacheBypassed()) return load()
  const { unstable_cache } = await import('next/cache.js')
  return unstable_cache(load, keyParts, options)()
}
