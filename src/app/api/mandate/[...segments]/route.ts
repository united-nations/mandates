import { NextRequest } from 'next/server'
import DataService from '@/lib/data-service'
import type { Mandate, Paragraph } from '@/types'

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

    // Get all mandates and find the one we need
    const mandates = await DataService.getMandates()
    const mandate = mandates.find(
      (m) => m.full_document_symbol === documentSymbol
    )

    if (!mandate) {
      return Response.json({ error: 'Mandate not found' }, { status: 404 })
    }

    // Get entity reference data (needed for entity lookups)
    const { entities } = await DataService.getAllData()

    // Filter paragraphs if they exist
    let filteredParagraphs: Paragraph[] = []
    if (mandate.paragraphs) {
      // Filter out frontmatter, backmatter, footers, titles, and non-English content
      filteredParagraphs = mandate.paragraphs.filter(
        (p) =>
          !p.is_frontmatter &&
          p.type !== 'backmatter' &&
          p.type !== 'frontmatter' &&
          p.type !== 'footer' &&
          p.type !== 'title' &&
          (!p.language || p.language.toLowerCase() === 'english')
      )
    }

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
