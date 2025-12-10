/**
 * Treemap layout utilities using the squarify algorithm
 * Extracted from snippets/BudgetTreemap.tsx
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface TreemapItem<T = any> {
  value: number
  data: T
}

export interface TreemapRect<T = any> extends Rect {
  data: T
}

// Gap between treemap cells (in percentage units)
const GAP = 0.15

/**
 * Squarify algorithm for treemap layout
 * Creates rectangles with aspect ratios close to 1 for better readability
 */
export function squarify<T>(
  items: TreemapItem<T>[],
  x: number,
  y: number,
  width: number,
  height: number
): TreemapRect<T>[] {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  if (total === 0 || items.length === 0) return []

  const normalized = items.map((item) => ({
    ...item,
    normalizedValue: (item.value / total) * width * height,
  }))

  return slice(normalized, x, y, width, height)
}

/**
 * Recursive slicing function for squarify algorithm
 * Splits items into two groups and recursively lays them out
 */
function slice<T>(
  items: (TreemapItem<T> & { normalizedValue: number })[],
  x: number,
  y: number,
  width: number,
  height: number
): TreemapRect<T>[] {
  if (items.length === 0) return []
  if (items.length === 1) {
    return [{ x, y, width, height, data: items[0].data }]
  }

  const total = items.reduce((sum, item) => sum + item.normalizedValue, 0)

  // Find split point (roughly in the middle by area)
  let sum = 0
  let splitIndex = 0
  for (let i = 0; i < items.length; i++) {
    sum += items[i].normalizedValue
    if (sum >= total / 2) {
      splitIndex = i + 1
      break
    }
  }
  splitIndex = Math.max(1, Math.min(splitIndex, items.length - 1))

  const leftItems = items.slice(0, splitIndex)
  const rightItems = items.slice(splitIndex)

  const leftSum = leftItems.reduce((sum, item) => sum + item.normalizedValue, 0)

  // Split horizontally or vertically based on aspect ratio
  if (width >= height) {
    const leftWidth = width * (leftSum / total) - GAP / 2
    return [
      ...slice(leftItems, x, y, leftWidth, height),
      ...slice(
        rightItems,
        x + leftWidth + GAP,
        y,
        width - leftWidth - GAP,
        height
      ),
    ]
  } else {
    const leftHeight = height * (leftSum / total) - GAP / 2
    return [
      ...slice(leftItems, x, y, width, leftHeight),
      ...slice(
        rightItems,
        x,
        y + leftHeight + GAP,
        width,
        height - leftHeight - GAP
      ),
    ]
  }
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

/**
 * Format percentage with one decimal place
 */
export function formatPercentage(num: number): string {
  return `${num.toFixed(1)}%`
}

/**
 * Round value for display (epistemic humility)
 * Returns value with ~ prefix to indicate approximation
 */
export function formatApproximate(num: number): string {
  const rounded = Math.round(num)
  return `~${formatNumber(rounded)}`
}
