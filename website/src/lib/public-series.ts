/** Public relationship wording describes versions, without asserting legal status. */
export function publicSeries<
  T extends {
    superseded_by: string | null
    is_latest: boolean
    is_collection: boolean
  },
>(series: T | null | undefined, symbol: string) {
  if (!series) return null
  const { superseded_by, ...facts } = series
  return {
    ...facts,
    latest_version: series.is_collection
      ? null
      : (superseded_by ?? (series.is_latest ? symbol : null)),
  }
}
