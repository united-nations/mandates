/** Adapted from Open UN's @un-eosg/ui/lib/format-budget.ts. */
const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

export function formatBudgetUsd(amount: number): string {
  if (!Number.isFinite(amount)) return '—'
  if (amount === 0) return '$0'
  if (Math.abs(amount) < 1000) return amount < 0 ? '−(<$1K)' : '<$1K'
  return currency.format(amount)
}
