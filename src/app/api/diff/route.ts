import { NextRequest, NextResponse } from 'next/server'
import * as Diff from 'diff'
import * as levenshtein from 'fast-levenshtein'
import { fetchDocument } from '@/lib/document-fetcher'

// Calculate similarity ratio (0-1) using standard Levenshtein ratio formula
function ratio(a: string, b: string): number {
  const totalLen = a.length + b.length
  if (totalLen === 0) return 1.0
  const distance = levenshtein.get(a, b)
  return (totalLen - distance) / totalLen
}

// Generate highlights for differences using diff library directly
function getHighlights(
  a: string | null,
  b: string | null
): [string | null, string | null] {
  a = a || ''
  b = b || ''

  const changes = Diff.diffChars(a, b)
  let leftHighlighted = ''
  let rightHighlighted = ''

  for (const change of changes) {
    if (change.added) {
      rightHighlighted += `**${change.value}**`
    } else if (change.removed) {
      leftHighlighted += `~~${change.value}~~`
    } else {
      leftHighlighted += change.value
      rightHighlighted += change.value
    }
  }

  return [leftHighlighted || null, rightHighlighted || null]
}

export async function POST(request: NextRequest) {
  try {
    const { symbolA, symbolB } = await request.json()

    if (!symbolA || !symbolB) {
      return NextResponse.json(
        { error: 'Both symbolA and symbolB are required' },
        { status: 400 }
      )
    }

    // Fetch documents from UN API
    const [docA, docB] = await Promise.all([
      fetchDocument(symbolA),
      fetchDocument(symbolB),
    ])

    const a = docA.lines
    const b = docB.lines
    const formatA = docA.format
    const formatB = docB.format

    const THRESHOLD = 0.8
    let i = -1 // Start at -1 so first iteration checks from index 0
    let j = 0
    const ab: Array<{
      left: string | null
      left_best: string | null
      left_highlighted: string | null
      left_number: number | string
      right: string | null
      right_best: string | null
      right_highlighted: string | null
      right_number: number | string
      score: number | null
    }> = []

    // Track which lines from A have been used
    const usedALines = new Set<number>()

    while (j < b.length) {
      const bb = b[j]
      let aa: string | null = null
      let matchedI = -1

      // Look for matching line in remaining 'a' lines (starting from i+1)
      for (let _i = i + 1; _i < a.length; _i++) {
        if (usedALines.has(_i)) continue
        const _aa = a[_i]
        if (ratio(_aa, bb) > THRESHOLD) {
          // Process intermediate lines from A that don't have a direct match
          for (let __i = i + 1; __i < _i; __i++) {
            if (usedALines.has(__i)) continue
            const __aa = a[__i]
            const bestMatch = b.reduce(
              (best: { line: string | null; ratio: number }, _bb: string) => {
                const currentRatio = ratio(__aa, _bb)
                return currentRatio > best.ratio
                  ? { line: _bb, ratio: currentRatio }
                  : best
              },
              { line: null, ratio: 0 }
            )

            const bestMatchLine =
              bestMatch.ratio > THRESHOLD ? bestMatch.line : null
            const [leftHighlighted, rightHighlighted] = getHighlights(
              __aa,
              bestMatchLine
            )

            ab.push({
              left: __aa,
              left_best: null,
              left_highlighted: leftHighlighted,
              left_number: __i,
              right: null,
              right_best: bestMatchLine,
              right_highlighted: rightHighlighted,
              right_number: '-',
              score: null,
            })
            usedALines.add(__i)
          }
          i = _i
          matchedI = _i
          aa = _aa
          usedALines.add(_i)
          break
        }
      }

      let bestMatch: string | null = null
      if (!aa) {
        // No sequential match found, look for best match anywhere in A
        const bestMatchResult = a.reduce(
          (
            best: { line: string | null; ratio: number; index: number },
            _aa: string,
            idx: number
          ) => {
            if (usedALines.has(idx)) return best
            const currentRatio = ratio(_aa, bb)
            return currentRatio > best.ratio
              ? { line: _aa, ratio: currentRatio, index: idx }
              : best
          },
          { line: null, ratio: 0, index: -1 }
        )

        bestMatch =
          bestMatchResult.ratio > THRESHOLD ? bestMatchResult.line : null
      }

      const [leftHighlighted, rightHighlighted] = getHighlights(
        aa || bestMatch,
        bb
      )

      ab.push({
        left: aa,
        left_best: bestMatch,
        left_highlighted: leftHighlighted,
        left_number: matchedI >= 0 ? matchedI : '-',
        right: bb,
        right_best: null,
        right_highlighted: rightHighlighted,
        right_number: j,
        score: ratio(aa || bestMatch || '', bb),
      })

      j++
    }

    // Add any remaining lines from A that weren't matched
    for (let k = 0; k < a.length; k++) {
      if (usedALines.has(k)) continue
      const leftLine = a[k]
      const bestMatch = b.reduce(
        (best: { line: string | null; ratio: number }, _bb: string) => {
          const currentRatio = ratio(leftLine, _bb)
          return currentRatio > best.ratio
            ? { line: _bb, ratio: currentRatio }
            : best
        },
        { line: null, ratio: 0 }
      )

      const bestMatchLine =
        bestMatch.ratio > THRESHOLD ? bestMatch.line : null
      const [leftHighlighted, rightHighlighted] = getHighlights(
        leftLine,
        bestMatchLine
      )

      ab.push({
        left: leftLine,
        left_best: null,
        left_highlighted: leftHighlighted,
        left_number: k,
        right: null,
        right_best: bestMatchLine,
        right_highlighted: rightHighlighted,
        right_number: '-',
        score: null,
      })
    }

    // Calculate overall score
    const scores = ab
      .filter((item) => item.score !== null)
      .map((item) => item.score as number)
    const score =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0

    const data = {
      score,
      diff: ab,
      formats: { left: formatA, right: formatB },
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error processing diff:', error)
    return NextResponse.json(
      { error: 'Failed to process diff' },
      { status: 500 }
    )
  }
}
