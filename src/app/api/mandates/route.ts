import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import type { Mandate, CitationInfo } from '@/types';
import { fuzzySearch, type SearchField, type FuzzyResult } from '@/lib/fuzzy-search';

let mandates: Mandate[] = [];

async function getMandates(): Promise<Mandate[]> {
  if (mandates.length > 0) {
    return mandates;
  }

  const jsonDirectory = path.join(process.cwd(), 'data');
  const fileContents = await fs.readFile(path.join(jsonDirectory, 'ppb2026_unique_mandates_with_metadata.json'), 'utf8');
  
  const rawData = JSON.parse(fileContents);
  mandates = rawData.sort((a: any, b: any) => b.num_entities - a.num_entities);
  return mandates;
}

interface SearchResult extends Mandate {
  searchScore: number;
  match_details: string[];
  highlightedTitle?: string;
  highlightedFields?: { [key: string]: string };
}

// Define searchable fields
const searchFields: SearchField[] = [
  {
    name: 'title',
    getValue: (mandate: Mandate) => mandate.title || '',
  },
  {
    name: 'document_symbol',
    getValue: (mandate: Mandate) => mandate.document_symbol || '',
  },
];

function performEnhancedTextSearch(mandates: Mandate[], query: string): SearchResult[] {
  if (!query.trim()) {
    return mandates as SearchResult[];
  }
  
  const fuzzyResults: FuzzyResult<Mandate>[] = fuzzySearch(
    mandates,
    query,
    searchFields,
    {
      includeMatches: true,
      minMatchCharLength: 2,
      tokenize: true,
      matchAllTokens: false
    }
  );

  return fuzzyResults.map(result => {
    const matchedFields = new Set<string>();
    
    // Collect which fields had matches
    result.matches.forEach(match => {
      if (match.key) {
        matchedFields.add(match.key);
      }
    });

    // Create friendly field names for display
    const fieldDisplayNames: { [key: string]: string } = {
      title: 'Title',
      document_symbol: 'Document Symbol'
    };

    const match_details = Array.from(matchedFields).map(field => 
      fieldDisplayNames[field] || field
    );

    return {
      ...result.item,
      searchScore: 0, // Score is not used
      match_details,
      highlightedTitle: result.highlightedFields.title || undefined,
      highlightedFields: result.highlightedFields
    };
  });
}

export async function GET(request: Request) {
  try {
    const allMandates = await getMandates();
    const { searchParams } = new URL(request.url);

    const entity = searchParams.get('entity');
    const keyword = searchParams.get('keyword');
    const organ = searchParams.get('organ');
    const programme = searchParams.get('programme');
    const startYear = searchParams.get('start_year');
    const endYear = searchParams.get('end_year');
    const budgetDocument = searchParams.get('budget_document');
    const pillar = searchParams.get('pillar');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortBy = searchParams.get('sort_by');

    let filteredMandates: Mandate[] = allMandates;

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

    if (startYear && endYear) {
      const start = parseInt(startYear, 10);
      const end = parseInt(endYear, 10);
      
      // Get the original year range from metadata
      const years = allMandates
        .map(m => parseInt(m.year?.toString() || '0', 10))
        .filter(year => !isNaN(year) && year > 0);
      const originalMin = Math.min(...years);
      const originalMax = Math.max(...years);
      
      // If the filter is at original range, include documents with missing/invalid years
      const isOriginalRange = start === originalMin && end === originalMax;
      
      filteredMandates = filteredMandates.filter((m) => {
        const year = parseInt(m.year?.toString() || '0', 10);
        
        // If year is invalid/missing and we're at original range, include it
        if (isOriginalRange && (isNaN(year) || year <= 0)) {
          return true;
        }
        
        // Otherwise, only include if year is valid and within range
        return !isNaN(year) && year > 0 && year >= start && year <= end;
      });
    }

    if (budgetDocument && budgetDocument !== 'all') {
      filteredMandates = filteredMandates.filter((m) => m.origin_document === budgetDocument);
    }

    if (keyword) {
      const searchResults = performEnhancedTextSearch(filteredMandates, keyword);
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
    const allFilteredEntities = filteredMandates.flatMap(mandate => mandate.entities || []);
    const uniqueEntitiesCount = new Set(allFilteredEntities.filter(Boolean)).size;
    const allFilteredBodies = filteredMandates.map(mandate => mandate.body);
    const uniqueBodiesCount = new Set(allFilteredBodies.filter(Boolean)).size;
    const allFilteredProgrammes = new Set<string>();
    const allFilteredSections = new Set<string>();
    for (const mandate of filteredMandates) {
        if (mandate.citation_info) {
            for (const citation of mandate.citation_info) {
                if(citation.programme_title) {
                    allFilteredProgrammes.add(citation.programme_title);
                }
                if(citation.section_title) {
                    allFilteredSections.add(citation.section_title);
                }
            }
        }
    }
    const uniqueProgrammesCount = allFilteredProgrammes.size;
    const uniqueProgrammes = Array.from(allFilteredProgrammes).sort();
    const uniqueSections = Array.from(allFilteredSections).sort();

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
      uniqueProgrammes,
      uniqueSections,
    });
  } catch (error) {
    console.error('Failed to load mandate data:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}