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

  const transformedData = rawData.map((item: any) => ({
    ...item,
    document_title: item.title,
    document_symbol: item.symbol,
    issuing_body_or_bodies: item.body ? [item.body] : [],
    mentions: item.entities,
    ai_summary: item.ai_summary || null,
  }));

  // Sort by num_entities descending initially
  transformedData.sort((a: any, b: any) => b.num_entities - a.num_entities);

  mandates = transformedData;
  
  console.log('--- MANDATE DATA STRUCTURE ---');
  console.log(JSON.stringify(mandates[0], null, 2));
  
  return mandates;
}

interface SearchResult extends Mandate {
  searchScore: number;
  match_details: string[];
  highlightedTitle?: string;
  highlightedFields?: { [key: string]: string };
}

// Define searchable fields with weights
const searchFields: SearchField[] = [
  {
    name: 'title',
    weight: 10.0,
    getValue: (mandate: Mandate) => mandate.title || mandate.document_title || ''
  },
  {
    name: 'document_symbol',
    weight: 8.0,
    getValue: (mandate: Mandate) => mandate.document_symbol || mandate.full_document_symbol || ''
  },
  {
    name: 'ai_summary',
    weight: 7.0,
    getValue: (mandate: Mandate) => mandate.ai_summary || ''
  },
  {
    name: 'subject_headings',
    weight: 6.0,
    getValue: (mandate: Mandate) => mandate.subject_headings || []
  },
  {
    name: 'abstract',
    weight: 5.0,
    getValue: (mandate: Mandate) => mandate.abstract || []
  },
  {
    name: 'issuing_body',
    weight: 5.0,
    getValue: (mandate: Mandate) => mandate.body || mandate.issuing_body_or_bodies || []
  },
  {
    name: 'entities',
    weight: 4.0,
    getValue: (mandate: Mandate) => mandate.entities || mandate.mentions || []
  },
  {
    name: 'priority_area',
    weight: 4.0,
    getValue: (mandate: Mandate) => mandate.priority_area || ''
  },
  {
    name: 'pillar',
    weight: 3.0,
    getValue: (mandate: Mandate) => mandate.pillar || ''
  },
  {
    name: 'programme_titles',
    weight: 3.0,
    getValue: (mandate: Mandate) => 
      mandate.citation_info?.map(c => c.programme_title).filter(Boolean) || []
  },
  {
    name: 'section_titles',
    weight: 3.0,
    getValue: (mandate: Mandate) => 
      mandate.citation_info?.map(c => c.section_title).filter(Boolean) || []
  },
  {
    name: 'descriptions',
    weight: 2.0,
    getValue: (mandate: Mandate) => 
      mandate.citation_info?.map(c => c.description).filter(Boolean) || []
  },
  {
    name: 'operative_paragraphs',
    weight: 2.0,
    getValue: (mandate: Mandate) => mandate.operative_paragraphs || []
  },
  {
    name: 'note',
    weight: 1.5,
    getValue: (mandate: Mandate) => mandate.note || []
  },
  {
    name: 'subtitle',
    weight: 1.5,
    getValue: (mandate: Mandate) => mandate.subtitle || ''
  },
  {
    name: 'uniform_title',
    weight: 1.0,
    getValue: (mandate: Mandate) => mandate.uniform_title || []
  },
  {
    name: 'translated_title',
    weight: 1.0,
    getValue: (mandate: Mandate) => mandate.translated_title || []
  }
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
      threshold: 0.1,
      maxDistance: 2,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      shouldSort: true,
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
      document_symbol: 'Document Symbol',
      ai_summary: 'Summary',
      subject_headings: 'Subject Headings',
      abstract: 'Abstract',
      issuing_body: 'Issuing Body',
      entities: 'Entities',
      priority_area: 'Priority Area',
      pillar: 'Pillar',
      programme_titles: 'Programme Titles',
      section_titles: 'Section Titles',
      descriptions: 'Descriptions',
      operative_paragraphs: 'Operative Paragraphs',
      note: 'Notes',
      subtitle: 'Subtitle',
      uniform_title: 'Uniform Title',
      translated_title: 'Translated Title'
    };

    const match_details = Array.from(matchedFields).map(field => 
      fieldDisplayNames[field] || field
    );

    return {
      ...result.item,
      searchScore: result.score,
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
    const priorityArea = searchParams.get('priority_area');
    const keyword = searchParams.get('keyword');
    const organ = searchParams.get('organ');
    const programme = searchParams.get('programme');
    const startYear = searchParams.get('start_year');
    const endYear = searchParams.get('end_year');
    const budgetDocument = searchParams.get('budget_document');
    const section = searchParams.get('section');
    const pillar = searchParams.get('pillar');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
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

    if (startYear && endYear) {
      const start = parseInt(startYear, 10);
      const end = parseInt(endYear, 10);
      if (!isNaN(start) && !isNaN(end)) {
        filteredMandates = filteredMandates.filter((m) => {
          const mandateYear = parseInt(m.year, 10);
          return mandateYear >= start && mandateYear <= end;
        });
      }
    }

    if (budgetDocument && budgetDocument !== 'all') {
      if (budgetDocument === 'ppb2026') {
        filteredMandates = filteredMandates.filter((m) =>
          m.citation_info?.some((c) => c.origin_document === 'PPB 2026')
        );
      } else if (budgetDocument === 'pko') {
        filteredMandates = filteredMandates.filter((m) =>
          m.citation_info?.some((c) => c.origin_document?.startsWith('PKM'))
        );
      }
    }

    if (section) {
      const lowerSection = section.toLowerCase();
      filteredMandates = filteredMandates.filter((m) => 
        m.citation_info?.some((c: CitationInfo) => c.section_title?.toLowerCase().includes(lowerSection))
      );
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
    const allFilteredEntities = filteredMandates.flatMap(mandate => mandate.mentions);
    const uniqueEntitiesCount = new Set(allFilteredEntities).size;
    const allFilteredBodies = filteredMandates.flatMap(mandate => mandate.issuing_body_or_bodies);
    const uniqueBodiesCount = new Set(allFilteredBodies).size;
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