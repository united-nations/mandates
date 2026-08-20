export interface NumericSummary {
  max: number
  median: number
  min: number
}

const median = (sorted: number[]): number => {
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}

export const numericSummary = (values: number[]): NumericSummary => {
  if (values.length === 0) throw new Error('Expected at least one value')
  const sorted = [...values].sort((a, b) => a - b)
  return {
    max: sorted[sorted.length - 1],
    median: median(sorted),
    min: sorted[0],
  }
}
