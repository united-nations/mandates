import type { PilotSpan } from '#lib/paragraph-pilot'

export type PilotHighlightLayer =
  'activity' | 'assignee' | 'deliverable' | 'none'

/** Project one evidence layer without changing extraction records or source text. */
export function pilotDisplaySegments(
  text: string,
  start: number,
  spans: readonly PilotSpan[],
  layer: PilotHighlightLayer
): { start: number; text: string; spans: PilotSpan[] }[] {
  const end = start + text.length
  const relevant = spans.filter(
    (s) =>
      s.kind === layer &&
      Number.isInteger(s.start) &&
      Number.isInteger(s.end) &&
      s.start < s.end &&
      s.start < end &&
      s.end > start
  )
  const boundaries = [
    ...new Set([
      start,
      end,
      ...relevant.flatMap((s) => [
        Math.max(start, s.start),
        Math.min(end, s.end),
      ]),
    ]),
  ].sort((a, b) => a - b)
  return boundaries.slice(0, -1).map((from, i) => {
    const to = boundaries[i + 1]
    return {
      start: from,
      text: text.slice(from - start, to - start),
      spans: relevant.filter((s) => s.start <= from && s.end >= to),
    }
  })
}
