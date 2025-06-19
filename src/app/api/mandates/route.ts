import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import type { Mandate } from '@/types';

let mandates: Mandate[] = [];

async function getMandates(): Promise<Mandate[]> {
  if (mandates.length > 0) {
    return mandates;
  }

  const jsonDirectory = path.join(process.cwd(), 'data');
  const fileContents = await fs.readFile(path.join(jsonDirectory, 'ppb2026_unique_mandates_with_metadata.json'), 'utf8');
  
  const rawData = JSON.parse(fileContents);

  const transformedData = rawData.map((item: any) => ({
    ...item,
    document_title: item.title,
    document_symbol: item.symbol_x,
    issuing_body_or_bodies: item.body ? [item.body] : [],
    mentions: item.entities,
  }));

  // Sort by num_entities descending initially
  transformedData.sort((a: any, b: any) => b.num_entities - a.num_entities);

  mandates = transformedData;
  
  return mandates;
}

export async function GET(request: Request) {
  try {
    const allMandates = await getMandates();
    const { searchParams } = new URL(request.url);

    const entity = searchParams.get('entity');
    const priorityArea = searchParams.get('priority_area');
    const keyword = searchParams.get('keyword');
    const organ = searchParams.get('organ');
    const programme = searchParams.get('programme');
    const year = searchParams.get('year');
    const budgetDocument = searchParams.get('budget_document');
    const section = searchParams.get('section');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    let filteredMandates: Mandate[] = allMandates;

    if (priorityArea) {
      filteredMandates = filteredMandates.filter((m) => m.priority_area === priorityArea);
    }

    if (entity) {
      filteredMandates = filteredMandates.filter((m) => m.mentions.includes(entity));
    }

    if (organ) {
      filteredMandates = filteredMandates.filter((m) => m.issuing_body_or_bodies.includes(organ));
    }

    if (programme) {
      // Assuming 'programme' is a field in the mandate object. If not, this needs adjustment.
      // For now, let's assume a text search on a 'programme' field.
      const lowerProgramme = programme.toLowerCase();
      filteredMandates = filteredMandates.filter((m) => 
        (m as any).programme && (m as any).programme.toLowerCase().includes(lowerProgramme)
      );
    }

    if (year) {
      filteredMandates = filteredMandates.filter((m) => m.year === year);
    }

    if (budgetDocument && budgetDocument !== 'all') {
      // This assumes a field like 'budget_document_source' exists.
      filteredMandates = filteredMandates.filter((m) => 
        (m as any).budget_document_source === budgetDocument
      );
    }

    if (section) {
      // This assumes a field like 'document_section' exists.
      const lowerSection = section.toLowerCase();
      filteredMandates = filteredMandates.filter((m) => 
        (m as any).document_section && (m as any).document_section.toLowerCase().includes(lowerSection)
      );
    }

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      filteredMandates = filteredMandates.reduce((acc: Mandate[], m: Mandate) => {
        const match_details: string[] = [];
        const titleMatch = m.document_title && m.document_title.toLowerCase().includes(lowerKeyword);
        const symbolMatch = m.document_symbol && m.document_symbol.toLowerCase().includes(lowerKeyword);
        const bodyMatch = m.issuing_body_or_bodies && m.issuing_body_or_bodies.some(b => b.toLowerCase().includes(lowerKeyword));
        const entityMatch = m.mentions && m.mentions.some(e => e.toLowerCase().includes(lowerKeyword));

        if (titleMatch) match_details.push('Title');
        if (symbolMatch) match_details.push('Symbol');
        if (bodyMatch) match_details.push('Issuing Body');
        if (entityMatch) match_details.push('Mentioned Entities');

        if (match_details.length > 0) {
            acc.push({ ...m, match_details });
        }
        return acc;
    }, []);
    }
    
    // Calculate summary stats on filtered mandates
    const totalItems = filteredMandates.length;
    const totalCitations = filteredMandates.reduce((acc, mandate) => acc + (mandate.num_citations || 0), 0);
    const allFilteredEntities = filteredMandates.flatMap(mandate => mandate.mentions);
    const uniqueEntitiesCount = new Set(allFilteredEntities).size;
    const allFilteredBodies = filteredMandates.flatMap(mandate => mandate.issuing_body_or_bodies);
    const uniqueBodiesCount = new Set(allFilteredBodies).size;

    // Apply pagination
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const paginatedItems = filteredMandates.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      items: paginatedItems,
      totalItems,
      totalPages,
      currentPage: page,
      totalCitations,
      uniqueEntitiesCount,
      uniqueBodiesCount,
    });
  } catch (error) {
    console.error('Failed to load mandate data:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}