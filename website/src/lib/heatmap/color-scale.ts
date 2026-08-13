/**
 * Colour scale for the entity co-citation heatmap. Blends white → a section hue
 * with a sqrt transfer: the shared-document distribution is heavy-tailed, so a
 * linear scale would leave almost every cell pale. No external dependency.
 */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

/** Blend white → target by t∈[0,1]. */
function blendFromWhite(target: [number, number, number], t: number): string {
  const k = Math.max(0, Math.min(1, t))
  const c = (v: number) => Math.round(255 + (v - 255) * k)
  return `rgb(${c(target[0])}, ${c(target[1])}, ${c(target[2])})`
}

/** Pale tint of a hue (white → hue by a small t), for header backgrounds. */
export function tint(hex: string, t = 0.16): string {
  return blendFromWhite(hexToRgb(hex), t)
}

/**
 * Sequential colour for a non-negative `value` against `max`, blending white
 * toward `baseHex`. `gamma` shapes the transfer curve (lower = more saturated,
 * boosts small values; 0.5 = sqrt). Returns null for zero/empty cells.
 */
export function sequentialColor(
  value: number,
  max: number,
  baseHex: string,
  gamma = 0.5
): string | null {
  if (value <= 0 || max <= 0) return null
  return blendFromWhite(hexToRgb(baseHex), Math.pow(value / max, gamma))
}
