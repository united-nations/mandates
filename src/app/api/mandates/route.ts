import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import type { Mandate, CitationInfo } from '@/types';

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
    document_symbol: item.symbol,
    issuing_body_or_bodies: item.body ? [item.body] : [],
    mentions: item.entities,
  }));

  // Sort by num_entities descending initially
  transformedData.sort((a: any, b: any) => b.num_entities - a.num_entities);

  mandates = transformedData;
  
  return mandates;
}

interface SearchResult extends Mandate {
  searchScore: number;
  match_details: string[];
  highlightedTitle?: string;
}

function performTextSearch(mandates: Mandate[], query: string): SearchResult[] {
  if (!query.trim()) {
    return mandates as SearchResult[];
  }
  
  const lowerQuery = query.toLowerCase().trim();
  
  const searchResults: SearchResult[] = mandates.map(mandate => {
    let totalScore = 0;
    const matchDetails: string[] = [];
    
    // Search in title (high priority)
    const title = mandate.title || mandate.document_title || '';
    if (title && title.toLowerCase().includes(lowerQuery)) {
      totalScore += 10;
      matchDetails.push('Title');
    }
    
    // Search in document symbol (medium priority)
    const symbol = mandate.document_symbol || mandate.full_document_symbol || '';
    if (symbol && symbol.toLowerCase().includes(lowerQuery)) {
      totalScore += 8;
      matchDetails.push('Document Symbol');
    }
    
    // Create highlighted title
    let highlightedTitle = title;
    if (totalScore > 0 && title) {
      const regex = new RegExp(`(${lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      highlightedTitle = title.replace(regex, '<mark>$1</mark>');
    }
    
    return {
      ...mandate,
      searchScore: totalScore,
      match_details: matchDetails,
      highlightedTitle: totalScore > 0 ? highlightedTitle : undefined
    };
  });
  
  // Filter out results with no matches and sort by score
  return searchResults
    .filter(result => result.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore);
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
    const pillar = searchParams.get('pillar');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const sortBy = searchParams.get('sort_by');

    let filteredMandates: Mandate[] = allMandates;

    if (priorityArea) {
      filteredMandates = filteredMandates.filter((m) => m.priority_area === priorityArea);
    }

    if (entity) {
      filteredMandates = filteredMandates.filter((m) => m.mentions?.includes(entity));
    }

    if (pillar && pillar !== 'all') {
      filteredMandates = filteredMandates.filter((m) => m.pillar === pillar);
    }

    if (organ) {
      filteredMandates = filteredMandates.filter((m) => m.issuing_body_or_bodies?.includes(organ));
    }

    if (programme) {
      const lowerProgramme = programme.toLowerCase();
      filteredMandates = filteredMandates.filter((m) =>
        m.citation_info?.some((c: CitationInfo) => c.programme_title?.toLowerCase().includes(lowerProgramme))
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
        m.citation_info?.some((c: CitationInfo) => c.section_title?.toLowerCase().includes(lowerSection))
      );
    }

    if (keyword) {
      const searchResults = performTextSearch(filteredMandates, keyword);
      filteredMandates = searchResults;
    }
    
    // Sorting logic
    if (sortBy && sortBy !== 'default') {
        const [sortField, sortDirection] = sortBy.split('_');
        const sortOrder = sortDirection === 'asc' ? 1 : -1;

        filteredMandates.sort((a, b) => {
            let valA: any, valB: any;
            if (sortField === 'citations') {
                valA = a.num_citations || 0;
                valB = b.num_citations || 0;
            } else if (sortField === 'year') {
                valA = parseInt(a.year, 10) || 0;
                valB = parseInt(b.year, 10) || 0;
            } else {
                return 0;
            }
            if (valA < valB) return -1 * sortOrder;
            if (valA > valB) return 1 * sortOrder;
            
            // secondary sort for tie-breaking
            if (sortField === 'year') {
                return (b.num_citations || 0) - (a.num_citations || 0);
            }
            if (sortField === 'citations') {
                return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0);
            }

            return 0;
        });
    }

    // Calculate summary stats on filtered mandates
    const totalItems = filteredMandates.length;
    const totalCitations = filteredMandates.reduce((acc, mandate) => acc + (mandate.num_citations || 0), 0);
    const allFilteredEntities = filteredMandates.flatMap(mandate => mandate.mentions);
    const uniqueEntitiesCount = new Set(allFilteredEntities).size;
    const allFilteredBodies = filteredMandates.flatMap(mandate => mandate.issuing_body_or_bodies);
    const uniqueBodiesCount = new Set(allFilteredBodies).size;
    const allFilteredProgrammes = new Set<string>();
    for (const mandate of filteredMandates) {
        if (mandate.citation_info) {
            for (const citation of mandate.citation_info) {
                if(citation.programme_title) {
                    allFilteredProgrammes.add(citation.programme_title);
                }
            }
        }
    }
    const uniqueProgrammesCount = allFilteredProgrammes.size;

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
      uniqueProgrammesCount,
    });
  } catch (error) {
    console.error('Failed to load mandate data:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}