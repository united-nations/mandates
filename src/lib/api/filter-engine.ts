import type { Mandate, CitationInfo } from '@/types';
import { fuzzySearch, type SearchField, type FuzzyResult } from '@/lib/fuzzy-search';

export interface FilterParams {
  entity?: string;
  organ?: string;
  keyword?: string;
  programme?: string;
  subject?: string;
  start_year?: string;
  end_year?: string;
  budget_document?: string;
  pillar?: string;
  cross_entity?: string;
  sort_by?: string;
  page?: string;
  limit?: string;
}

export interface FilterResult {
  filteredMandates: Mandate[];
  metadata: {
    totalItems: number;
    uniqueEntities: number;
    uniqueOrgans: number;
    totalCitations: number;
    uniqueEntitiesWithCount: Array<{ name: string; count: number }>;
    uniqueOrgansWithCount: Array<{ name: string; count: number }>;
    organBreakdown: Array<{ name: string; count: number }>;
    yearDistribution: { [year: string]: number };
    yearRange: { min: number; max: number } | null;
    uniqueProgrammes: string[];
    uniqueSubjects: string[];
  };
  pagination: {
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

/**
 * Central filter engine that handles all filtering logic consistently
 */
export class FilterEngine {
  private static searchFields: SearchField[] = [
    {
      name: 'title',
      weight: 2.0,
      getValue: (mandate: Mandate) => mandate.title || '',
    },
    {
      name: 'uniform_title',
      weight: 2.0,
      getValue: (mandate: Mandate) => {
        if (mandate.body === "Security Council" && mandate.uniform_title && mandate.uniform_title.length > 0) {
          return mandate.uniform_title[0];
        }
        return '';
      },
    },
    {
      name: 'description',
      weight: 1.8,
      getValue: (mandate: Mandate) => mandate.description || '',
    },
    {
      name: 'document_symbol',
      weight: 1.5,
      getValue: (mandate: Mandate) => mandate.document_symbol || '',
    }
  ];

  /**
   * Apply all filters to mandates data
   */
  static filterMandates(allMandates: Mandate[], params: FilterParams): FilterResult {
    const {
      entity,
      organ,
      keyword,
      programme,
      subject,
      start_year,
      end_year,
      budget_document,
      pillar,
      cross_entity,
      sort_by,
      page = '1',
      limit = '10'
    } = params;

    let filteredMandates: Mandate[] = [...allMandates];

    // Apply filters in order of specificity
    
    // 1. Entity filter (most specific)
    if (entity) {
      filteredMandates = filteredMandates.filter((m) => m.entities?.includes(entity));
    }

    // 2. Cross-entity filter (mandates cited by both entity and cross_entity)
    if (cross_entity && entity) {
      filteredMandates = filteredMandates.filter((m) => 
        m.entities?.includes(entity) && m.entities?.includes(cross_entity)
      );
    }

    // 3. Organ filter
    if (organ) {
      filteredMandates = filteredMandates.filter((m) => m.body === organ);
    }

    // 4. Pillar filter
    if (pillar && pillar !== 'all') {
      filteredMandates = filteredMandates.filter((m) => m.pillar === pillar);
    }

    // 5. Programme filter
    if (programme) {
      const lowerProgramme = programme.toLowerCase();
      filteredMandates = filteredMandates.filter((m) =>
        m.citation_info?.some((c: CitationInfo) => 
          c.programme_title?.toLowerCase().includes(lowerProgramme)
        )
      );
    }

    // 6. Subject filter
    if (subject) {
      filteredMandates = filteredMandates.filter((m) =>
        m.subject_headings?.some((subjectHeading: string) => 
          subjectHeading?.toLowerCase().trim() === subject.toLowerCase().trim()
        )
      );
    }

    // 7. Year range filter
    if (start_year && end_year) {
      const start = parseInt(start_year, 10);
      const end = parseInt(end_year, 10);
      
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

    // 8. Budget document filter
    if (budget_document && budget_document !== 'all') {
      const budgetDocumentMapping: { [key: string]: (citation: CitationInfo) => boolean } = {
        'ppb2026': (citation) => citation.origin_document === 'PPB 2026',
        'pko': (citation) => typeof citation.origin_document === 'string' && 
                            citation.origin_document.startsWith('PKM 25/26'),
        'PPB 2026/Plan Outline': (citation) => citation.origin_document === 'PPB 2026/Plan Outline',
      };
      const matchFn = budgetDocumentMapping[budget_document] || 
                      ((citation) => citation.origin_document === budget_document);
      filteredMandates = filteredMandates.filter((m) => 
        m.citation_info?.some(matchFn)
      );
    }

    // 9. Keyword search (applied last to filtered results)
    if (keyword) {
      const searchResults = this.performTextSearch(filteredMandates, keyword);
      filteredMandates = searchResults;
    }

    // Apply sorting
    const sortedMandates = this.applySorting(filteredMandates, sort_by, !!keyword);

    // Calculate metadata from filtered results
    const metadata = this.calculateMetadata(sortedMandates, entity);

    // Apply pagination
    const pageNum = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const totalPages = Math.ceil(sortedMandates.length / pageSize);
    const startIndex = (pageNum - 1) * pageSize;
    const paginatedMandates = sortedMandates.slice(startIndex, startIndex + pageSize);

    return {
      filteredMandates: paginatedMandates,
      metadata,
      pagination: {
        totalPages,
        currentPage: pageNum,
        pageSize
      }
    };
  }

  /**
   * Perform text search on mandates
   */
  private static performTextSearch(mandates: Mandate[], query: string): Mandate[] {
    if (!query.trim()) {
      return mandates;
    }
    
    const fuzzyResults: FuzzyResult<Mandate>[] = fuzzySearch(
      mandates,
      query,
      this.searchFields,
      {
        threshold: 0.4,
        includeMatches: true,
        minMatchCharLength: 2,
        findAllMatches: true,
        ignoreLocation: true
      }
    );

    return fuzzyResults.map(result => {
      const matchedFields = new Set<string>();
      
      result.matches.forEach(match => {
        if (match.key) {
          matchedFields.add(match.key);
        }
      });

      const fieldDisplayNames: { [key: string]: string } = {
        title: 'Title',
        uniform_title: 'Title (Uniform)',
        document_symbol: 'Document Symbol',
        description: 'Description'
      };

      const match_details = Array.from(matchedFields).map(field => 
        fieldDisplayNames[field] || field
      );

      let highlightedTitle: string | undefined;
      
      if (result.item.body === "Security Council" && result.item.uniform_title && result.item.uniform_title.length > 0) {
        highlightedTitle = result.highlightedFields.uniform_title || 
                          result.highlightedFields.title || 
                          result.highlightedFields.description;
      } else {
        highlightedTitle = result.highlightedFields.title || 
                          result.highlightedFields.description;
      }

      return {
        ...result.item,
        searchScore: result.score,
        match_details,
        highlightedTitle,
        highlightedFields: result.highlightedFields
      } as Mandate;
    });
  }

  /**
   * Apply sorting to mandates
   */
  private static applySorting(mandates: Mandate[], sortBy?: string, hasKeyword?: boolean): Mandate[] {
    const sortOrder = sortBy || (hasKeyword ? 'default' : 'citing_entities_desc');
    
    if (sortOrder === 'default' && hasKeyword) {
      // For search results, they're already sorted by relevance
      return mandates;
    }

    const sorted = [...mandates];
    
    if (sortOrder === 'citing_entities_desc' || sortOrder === 'citing_entities_asc') {
      const direction = sortOrder === 'citing_entities_asc' ? 1 : -1;
      
      sorted.sort((a, b) => {
        const valA = a.num_entities || 0;
        const valB = b.num_entities || 0;
        
        if (valA < valB) return -1 * direction;
        if (valA > valB) return 1 * direction;
        
        // Secondary sort by citations
        const citationsA = a.num_citations || 0;
        const citationsB = b.num_citations || 0;
        return citationsB - citationsA;
      });
    } else if (sortOrder.startsWith('year_')) {
      const direction = sortOrder === 'year_asc' ? 1 : -1;
      
      sorted.sort((a, b) => {
        const yearA = a.year ? parseInt(a.year, 10) : null;
        const yearB = b.year ? parseInt(b.year, 10) : null;
        const aHasValidYear = yearA !== null && !isNaN(yearA) && yearA > 0;
        const bHasValidYear = yearB !== null && !isNaN(yearB) && yearB > 0;

        if (aHasValidYear && !bHasValidYear) return -1;
        if (!aHasValidYear && bHasValidYear) return 1;

        if (aHasValidYear && bHasValidYear) {
          if (yearA! < yearB!) return -1 * direction;
          if (yearA! > yearB!) return 1 * direction;
        }

        // Secondary sort by citations
        return (b.num_citations || 0) - (a.num_citations || 0);
      });
    } else if (sortOrder.startsWith('citations_')) {
      const direction = sortOrder === 'citations_asc' ? 1 : -1;
      
      sorted.sort((a, b) => {
        const valA = a.num_citations || 0;
        const valB = b.num_citations || 0;
        
        if (valA < valB) return -1 * direction;
        if (valA > valB) return 1 * direction;
        
        // Secondary sort by year
        const yearB_val = parseInt(b.year || '0', 10) || 0;
        const yearA_val = parseInt(a.year || '0', 10) || 0;
        return yearB_val - yearA_val;
      });
    }
    
    return sorted;
  }

  /**
   * Calculate metadata from filtered mandates
   */
  private static calculateMetadata(mandates: Mandate[], entityFilter?: string) {
    const totalItems = mandates.length;
    
    // Calculate total citations
    let totalCitations: number;
    if (entityFilter) {
      // When filtering by entity, count only citations from that specific entity
      totalCitations = mandates.reduce((acc, mandate) => {
        const entityCitations = mandate.citation_info?.filter(
          citation => citation.entity === entityFilter
        ).length || 0;
        return acc + entityCitations;
      }, 0);
    } else {
      // When not filtering by entity, count all citations
      totalCitations = mandates.reduce((acc, mandate) => acc + (mandate.num_citations || 0), 0);
    }
    
    // Calculate unique entities and their counts
    const entityCounts: { [key: string]: number } = {};
    const organCounts: { [key: string]: number } = {};
    const yearDistribution: { [year: string]: number } = {};
    const programmes = new Set<string>();
    const subjects = new Set<string>();
    
    mandates.forEach(mandate => {
      // Count entities
      if (mandate.entities) {
        mandate.entities.forEach(entity => {
          entityCounts[entity] = (entityCounts[entity] || 0) + 1;
        });
      }
      
      // Count organs
      if (mandate.body) {
        organCounts[mandate.body] = (organCounts[mandate.body] || 0) + 1;
      }
      
      // Count years
      if (mandate.year) {
        const year = parseInt(mandate.year, 10);
        if (!isNaN(year)) {
          yearDistribution[year] = (yearDistribution[year] || 0) + 1;
        }
      }
      
      // Collect programmes
      if (mandate.citation_info) {
        mandate.citation_info.forEach(citation => {
          if (citation.programme_title) {
            programmes.add(citation.programme_title);
          }
        });
      }
      
      // Collect subjects
      if (mandate.subject_headings) {
        mandate.subject_headings.forEach(subject => {
          if (subject && subject.trim()) {
            subjects.add(subject.trim());
          }
        });
      }
    });
    
    const uniqueEntitiesWithCount = Object.entries(entityCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    const uniqueOrgansWithCount = Object.entries(organCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    // Calculate year range
    const years = Object.keys(yearDistribution).map(Number).filter(year => !isNaN(year));
    const yearRange = years.length > 0 ? {
      min: Math.min(...years),
      max: Math.max(...years)
    } : null;
    
    return {
      totalItems,
      uniqueEntities: Object.keys(entityCounts).length,
      uniqueOrgans: Object.keys(organCounts).length,
      totalCitations,
      uniqueEntitiesWithCount,
      uniqueOrgansWithCount,
      organBreakdown: uniqueOrgansWithCount,
      yearDistribution,
      yearRange,
      uniqueProgrammes: Array.from(programmes).sort(),
      uniqueSubjects: Array.from(subjects).sort()
    };
  }

  /**
   * Get cross-citations for an entity
   */
  static getCrossCitations(allMandates: Mandate[], targetEntity: string): Array<{
    entity: string;
    sharedMandatesCount: number;
    totalMandatesCount: number;
  }> {
    // Find all mandates that cite the target entity
    const mandatesCitingTargetEntity = allMandates.filter(mandate => 
      mandate.entities?.includes(targetEntity)
    );

    // Get all unique entities that appear in these mandates (excluding the target entity)
    const entityCitations: { [key: string]: Set<string> } = {};

    mandatesCitingTargetEntity.forEach(mandate => {
      if (mandate.entities) {
        mandate.entities.forEach(entity => {
          if (entity !== targetEntity) {
            if (!entityCitations[entity]) {
              entityCitations[entity] = new Set<string>();
            }
            // Use mandate document symbol or title as unique identifier
            const mandateId = mandate.document_symbol || mandate.title || `${mandate.body}-${mandate.year}`;
            if (mandateId) {
              entityCitations[entity].add(mandateId);
            }
          }
        });
      }
    });

    // Convert to array format with counts and sort by shared mandates count
    return Object.entries(entityCitations)
      .map(([entity, mandateSet]) => ({
        entity,
        sharedMandatesCount: mandateSet.size,
        totalMandatesCount: allMandates.filter(m => m.entities?.includes(entity)).length
      }))
      .sort((a, b) => {
        // First sort by shared mandates count (descending)
        if (b.sharedMandatesCount !== a.sharedMandatesCount) {
          return b.sharedMandatesCount - a.sharedMandatesCount;
        }
        // Then sort alphabetically by entity name
        return a.entity.localeCompare(b.entity);
      });
  }

  /**
   * Get cross-citations for an organ
   */
  static getOrganCrossCitations(allMandates: Mandate[], targetOrgan: string): Array<{
    entity: string;
    sharedMandatesCount: number;
    totalMandatesCount: number;
  }> {
    // Find all mandates issued by the target organ
    const mandatesFromTargetOrgan = allMandates.filter(mandate => 
      mandate.body === targetOrgan
    );

    // Get all unique entities that cite these mandates
    const entityCitations: { [key: string]: Set<string> } = {};

    mandatesFromTargetOrgan.forEach(mandate => {
      if (mandate.entities) {
        mandate.entities.forEach(entity => {
          if (!entityCitations[entity]) {
            entityCitations[entity] = new Set<string>();
          }
          // Use mandate document symbol or title as unique identifier
          const mandateId = mandate.document_symbol || mandate.title || `${mandate.body}-${mandate.year}`;
          if (mandateId) {
            entityCitations[entity].add(mandateId);
          }
        });
      }
    });

    // Convert to array format with counts and sort by shared mandates count
    return Object.entries(entityCitations)
      .map(([entity, mandateSet]) => ({
        entity,
        sharedMandatesCount: mandateSet.size,
        totalMandatesCount: allMandates.filter(m => m.entities?.includes(entity)).length
      }))
      .sort((a, b) => {
        // First sort by shared mandates count (descending)
        if (b.sharedMandatesCount !== a.sharedMandatesCount) {
          return b.sharedMandatesCount - a.sharedMandatesCount;
        }
        // Then sort alphabetically by entity name
        return a.entity.localeCompare(b.entity);
      });
  }
}
