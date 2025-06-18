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
  const fileContents = await fs.readFile(path.join(jsonDirectory, 'ppb2026_all_mandates_with_content.json'), 'utf8');
  
  const rawData = JSON.parse(fileContents) as Mandate[];

  // Sort by num_entities descending initially
  rawData.sort((a, b) => b.num_entities - a.num_entities);

  mandates = rawData;
  
  return mandates;
}

export async function GET(request: Request) {
  try {
    const allMandates = await getMandates();
    const { searchParams } = new URL(request.url);

    const entity = searchParams.get('entity');
    const priorityArea = searchParams.get('priority_area');
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let filteredMandates = allMandates;

    if (priorityArea) {
      filteredMandates = filteredMandates.filter((m) => m.priority_area === priorityArea);
    }

    if (entity) {
      filteredMandates = filteredMandates.filter((m) => m.entities.includes(entity));
    }

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      filteredMandates = filteredMandates.filter((m) =>
        (m.title && m.title.toLowerCase().includes(lowerKeyword)) ||
        (m.symbol && m.symbol.toLowerCase().includes(lowerKeyword)) ||
        (m.full_document_symbol && m.full_document_symbol.toLowerCase().includes(lowerKeyword)) ||
        (m.entities && m.entities.some(e => e.toLowerCase().includes(lowerKeyword)))
      );
    }
    
    // Apply pagination
    const totalItems = filteredMandates.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const paginatedItems = filteredMandates.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      items: paginatedItems,
      totalItems,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Failed to load mandate data:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 