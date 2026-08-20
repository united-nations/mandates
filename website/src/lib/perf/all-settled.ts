export const allSettledOrThrow = async <
  T extends readonly unknown[],
>(promises: { [K in keyof T]: Promise<T[K]> }): Promise<T> => {
  const results = await Promise.allSettled(promises)
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  )
  if (failure) throw failure.reason
  return results.map(
    (result) => (result as PromiseFulfilledResult<unknown>).value
  ) as unknown as T
}
