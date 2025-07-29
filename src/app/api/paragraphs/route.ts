import { NextRequest } from 'next/server'
import DataService from '@/lib/data-service'
import type { OperativeParagraph } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentSymbol = searchParams.get('full_document_symbol');
    const isOperative = searchParams.get('is_op_para'); // 'true', 'false', or null for all
    const deliverableType = searchParams.get('deliverable_type');

    if (!documentSymbol) {
      return Response.json({ error: 'full_document_symbol is required' }, { status: 400 });
    }

    // Get all mandates and find the one we need
    const mandates = await DataService.getMandates();
    const mandate = mandates.find(m => m.full_document_symbol === documentSymbol);
    
    if (!mandate || !mandate.paragraphs) {
      return Response.json({ paragraphs: [] });
    }

    let filteredParagraphs = mandate.paragraphs;

    // Filter out frontmatter, backmatter, and titles - only show meaningful content
    filteredParagraphs = filteredParagraphs.filter(p => 
      !p.is_frontmatter && 
      p.type !== 'backmatter' &&
      p.type !== 'frontmatter' &&
      p.type !== 'title'
    );

    // Filter by operative/non-operative based on paragraph_type
    // BUT always include headers regardless of filter
    if (isOperative === 'true') {
      // Show operative paragraphs + all headers
      filteredParagraphs = filteredParagraphs.filter(p => 
        p.type === 'heading' || p.paragraph_type === 'operative'
      );
    } else if (isOperative === 'false') {
      // Show non-operative paragraphs + all headers
      filteredParagraphs = filteredParagraphs.filter(p =>
        p.type === 'heading' || (p.paragraph_type && p.paragraph_type !== 'operative')
      );
    }
    // If isOperative is null/undefined, show all meaningful content (already filtered above)

    // Note: deliverable_type filtering is removed as it's not available in the new structure
    // If needed in the future, it could be implemented based on action_verb or other fields

    return Response.json({ paragraphs: filteredParagraphs });
  } catch (error) {
    console.error('Error in paragraphs API:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
