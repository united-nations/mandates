/**
 * Heatmap intensity uses shared CSS colour tokens. Interpolation stays in sRGB
 * with the existing gamma curve, so adopting tokens preserves the data scale.
 */
function blendFromWhite(baseColor: string, t: number): string {
  const percent = Math.max(0, Math.min(1, t)) * 100
  return `color-mix(in srgb, ${baseColor} ${percent}%, var(--color-un-white))`
}

export function tint(baseColor: string, t = 0.16): string {
  return blendFromWhite(baseColor, t)
}

export function sequentialColor(
  value: number,
  max: number,
  baseColor: string,
  gamma = 0.5
): string | null {
  if (value <= 0 || max <= 0) return null
  return blendFromWhite(baseColor, Math.pow(value / max, gamma))
}
