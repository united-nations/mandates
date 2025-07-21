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

    // Filter by operative/non-operative
    if (isOperative === 'true') {
      filteredParagraphs = filteredParagraphs.filter(p => p.is_op_para);
    } else if (isOperative === 'false') {
      filteredParagraphs = filteredParagraphs.filter(p => !p.is_op_para);
    }

    // Filter by deliverable type
    if (deliverableType) {
      filteredParagraphs = filteredParagraphs.filter(p =>
        p.deliverable_type && p.deliverable_type.includes(deliverableType)
      );
    }

    return Response.json({ paragraphs: filteredParagraphs });
  } catch (error) {
    console.error('Error in paragraphs API:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
