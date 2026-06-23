import { NextResponse, type NextRequest } from 'next/server'
import { diffUNDocuments } from '@/lib/data/un-document-diff'

export async function POST(request: NextRequest) {
  try {
    const { symbolA, symbolB } = await request.json()

    if (!symbolA || !symbolB) {
      return NextResponse.json(
        { error: 'Both symbolA and symbolB are required' },
        { status: 400 }
      )
    }

    const result = await diffUNDocuments(symbolA, symbolB)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error processing diff:', error)
    return NextResponse.json(
      { error: 'Failed to process diff' },
      { status: 500 }
    )
  }
}
