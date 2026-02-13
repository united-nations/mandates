import { NextRequest } from 'next/server'
import DataService from '@/lib/data-service'
import { getMandateBySymbol } from '@/lib/db/mandates'
import type { Paragraph } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ segments: string[] }> }
) {
  try {
    // Await params before using its properties
    const { segments } = await params

    // Reconstruct the full document symbol from segments (same as mandate page)
    const documentSymbol = segments
      .map((segment) => decodeURIComponent(segment))
      .join('/')

    // Fetch mandate from database
    const mandate = await getMandateBySymbol(documentSymbol)

    if (!mandate) {
      return Response.json({ error: 'Mandate not found' }, { status: 404 })
    }

    // Get entity reference data
    const entities = await DataService.getEntities()

    // Paragraphs are not stored in the database yet
    // TODO: Migrate paragraphs to database or separate storage
    const filteredParagraphs: Paragraph[] = []

    // Return unified response
    return Response.json({
      mandate,
      paragraphs: filteredParagraphs,
      reference: {
        entities: entities,
      },
    })
  } catch (error) {
    console.error('Error in unified mandate API:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
