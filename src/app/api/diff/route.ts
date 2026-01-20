import { NextRequest, NextResponse } from 'next/server'
import { diff } from 'undifferent/core'
import { fetchUNDocument } from 'undifferent/un-fetcher'

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
      fetchUNDocument(symbolA),
      fetchUNDocument(symbolB),
    ])

    const result = diff(docA.lines, docB.lines)

    // Map to the expected response format (for backwards compatibility)
    const mappedDiff = result.items.map((item) => ({
      left: item.left,
      left_best: item.leftBest,
      left_highlighted: item.leftHighlighted,
      left_number: item.leftNumber,
      right: item.right,
      right_best: item.rightBest,
      right_highlighted: item.rightHighlighted,
      right_number: item.rightNumber,
      score: item.score,
    }))

    return NextResponse.json({
      score: result.score,
      diff: mappedDiff,
      formats: { left: docA.format, right: docB.format },
    })
  } catch (error) {
    console.error('Error processing diff:', error)
    return NextResponse.json(
      { error: 'Failed to process diff' },
      { status: 500 }
    )
  }
}
