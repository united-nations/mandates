'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Mandate } from '@/types'; 
import { MandateList } from '@/components/mandate-list';
import { FilterControls } from '@/components/filter-controls';
import { PaginationControls } from '@/components/pagination-controls';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Landmark, Building, Target, Quote } from 'lucide-react';
import { MandateDetails } from '@/components/mandate-details';
import { SearchResultsSummary } from '@/components/search-results-summary';
import { DataCard } from '@/components/data-card';
import { CrossCitations } from '@/components/cross-citations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableDropdownOption } from '@/components/ui/searchable-dropdown';
import { explainerTexts } from '@/lib/explainer-texts';

interface Entity {
  entity: string;
  entity_long: string;
}

interface EntityWithCount {
  name: string;
  count: number;
}

interface BodyWithCount {
  name: string;
  count: number;
}

interface Organ {
  short: string;
  long: string;
}

interface MandateExplorerProps {
  // Optional pre-set entity filter
  presetEntity?: string;
  // Whether to show the entity data card (false for entity-specific views)
  showEntityCard?: boolean;
  // Additional CSS classes
  className?: string;
  // Custom title for the mandate list section
  mandateListTitle?: string;
}

export function MandateExplorer({ 
  presetEntity, 
  showEntityCard = true, 
  className = '',
  mandateListTitle
}: MandateExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const currentPage = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('limit') || '10');
  const selectedEntity = presetEntity || searchParams.get('entity') || '';
  const selectedOrgan = searchParams.get('organ') || '';
  const keywordFromParams = searchParams.get('keyword') || '';
  const programme = searchParams.get('programme') || '';
  const subject = searchParams.get('subject') || '';
  const startYearFromParams = searchParams.get('start_year');
  const endYearFromParams = searchParams.get('end_year');
  const budgetDocument = searchParams.get('budget_document') || '';
  const crossEntity = searchParams.get('cross_entity') || '';
  const sortBy = searchParams.get('sort_by') || (keywordFromParams ? 'default' : 'citing_entities_desc');

  const [keyword, setKeyword] = useState(keywordFromParams);
  
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const [uniqueOrgans, setUniqueOrgans] = useState(0);
  const [uniqueEntities, setUniqueEntities] = useState(0);
  const [totalCitations, setTotalCitations] = useState(0);

  const [allEntities, setAllEntities] = useState<Entity[]>([]);
  const [allOrgans, setAllOrgans] = useState<Organ[]>([]);
  const [entityOptions, setEntityOptions] = useState<EntityWithCount[]>([]);
  const [organOptions, setOrganOptions] = useState<BodyWithCount[]>([]);
  const [programmeOptions, setProgrammeOptions] = useState<string[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);

  const [yearDistribution, setYearDistribution] = useState<{ [year: string]: number }>({});
  const [yearRange, setYearRange] = useState<{ min: number; max: number } | null>(null);
  const [selectedYearRange, setSelectedYearRange] = useState<[number, number] | null>(null);

  const [selectedMandate, setSelectedMandate] = useState<Mandate | null>(null);

  const [sourceDocumentsPopover, setSourceDocumentsPopover] = useState(false);
  const [unOrgansPopover, setUnOrgansPopover] = useState(false);
  const [unEntitiesPopover, setUnEntitiesPopover] = useState(false);
  const [citationsPopover, setCitationsPopover] = useState(false);

  useEffect(() => {
    // Sync selectedYearRange with URL params when they change
    if (yearRange) {
      const startYear = startYearFromParams ? parseInt(startYearFromParams, 10) : yearRange.min;
      const endYear = endYearFromParams ? parseInt(endYearFromParams, 10) : yearRange.max;
      setSelectedYearRange([startYear, endYear]);
    }
  }, [startYearFromParams, endYearFromParams, yearRange]);

  useEffect(() => {
    async function fetchAllEntities() {
      try {
        const res = await fetch('/api/entities');
        if (res.ok) {
          const data = await res.json();
          setAllEntities(data);
        }
      } catch (error) {
        console.error("Failed to fetch all entities:", error);
      }
    }
    fetchAllEntities();
  }, []);

  useEffect(() => {
    async function fetchAllOrgans() {
      try {
        const res = await fetch('/api/organs');
        if (res.ok) {
          const data = await res.json();
          setAllOrgans(data);
        }
      } catch (error) {
        console.error("Failed to fetch organs data:", error);
      }
    }
    fetchAllOrgans();
  }, []);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const response = await fetch('/api/mandates/meta');
        const data = await response.json();
        setEntityOptions(data.uniqueEntities || []);
        setOrganOptions(data.uniqueBodiesWithCount || []);
        setSubjectOptions(data.uniqueSubjects || []);
        
        if (data.yearRange) {
          setYearRange(data.yearRange);
          const startYear = startYearFromParams ? parseInt(startYearFromParams, 10) : data.yearRange.min;
          const endYear = endYearFromParams ? parseInt(endYearFromParams, 10) : data.yearRange.max;
          setSelectedYearRange([startYear, endYear]);
        }
        if (data.yearDistribution) {
            setYearDistribution(data.yearDistribution);
        }
        
        // Set initial summary stats for the whole dataset
        setTotalItems(data.totalDocuments || 0);
        setUniqueOrgans(data.uniqueBodiesCount || 0);
        setUniqueEntities(data.totalEntities || 0);
        setTotalCitations(data.totalCitations || 0);
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
      }
    }
    fetchMetadata();
  }, []);

  const fetchMandates = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
    });
    if (selectedEntity) params.append('entity', selectedEntity);
    if (selectedOrgan) params.append('organ', selectedOrgan);
    if (keywordFromParams) params.append('keyword', keywordFromParams);
    if (programme) params.append('programme', programme);
    if (subject) params.append('subject', subject);
    if (startYearFromParams) params.append('start_year', startYearFromParams);
    if (endYearFromParams) params.append('end_year', endYearFromParams);
    if (budgetDocument) params.append('budget_document', budgetDocument);
    if (crossEntity) params.append('cross_entity', crossEntity);
    if (sortBy && sortBy !== 'default') {
        params.append('sort_by', sortBy);
    }

    try {
      const response = await fetch(`/api/mandates?${params.toString()}`);
      const data = await response.json();
      setMandates(data.items || []);
      setTotalItems(data.totalItems || 0);
      setTotalPages(data.totalPages || 0);
      
      // Update summary stats with filtered results
      setUniqueOrgans(data.uniqueBodiesCount || 0);
      setUniqueEntities(data.uniqueEntitiesCount || 0);
      setTotalCitations(data.totalCitations || 0);

      if (data.uniqueProgrammes) {
        setProgrammeOptions(data.uniqueProgrammes);
      }
    } catch (error) {
      console.error("Failed to fetch mandates:", error);
      setMandates([]);
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, selectedEntity, selectedOrgan, keywordFromParams, programme, subject, startYearFromParams, endYearFromParams, budgetDocument, crossEntity, sortBy]);
  
  useEffect(() => {
    fetchMandates();
  }, [fetchMandates]);

  useEffect(() => {
    // Only sync keyword input with URL param changes (not trigger search)
    if (keywordFromParams !== keyword) {
      setKeyword(keywordFromParams);
    }
  }, [keywordFromParams]);
  
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePageSizeChange = (size: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', String(size));
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
  
  const handleFilterChange = (key: string, value: string) => {
    // If we have a preset entity, don't allow changing the entity filter
    if (key === 'entity' && presetEntity) {
      return;
    }
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleYearRangeChange = (newRange: [number, number]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    params.set('start_year', String(newRange[0]));
    params.set('end_year', String(newRange[1]));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    params.set('sort_by', value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const onEntityChange = (value: string) => handleFilterChange('entity', value);
  const onOrganChange = (value: string) => handleFilterChange('organ', value);
  const onProgrammeChange = (value: string) => handleFilterChange('programme', value);
  const onSubjectChange = (value: string) => handleFilterChange('subject', value);
  const onBudgetDocumentChange = (value: string) => handleFilterChange('budget_document', value);

  const onKeywordChange = (value: string) => {
    setKeyword(value);
  };

  const onKeywordSearch = (searchTerm: string = keyword) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    if (searchTerm.trim()) {
      params.set('keyword', searchTerm.trim());
    } else {
      params.delete('keyword');
      // When clearing search, if sort was relevance, reset to default (citing entities)
      if (params.get('sort_by') === 'default') {
        params.set('sort_by', 'citing_entities_desc');
      }
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const budgetDocumentDisplayNames: { [key: string]: string } = {
    'ppb2026': 'Proposed Programme Budget for 2026',
    'PPB 2026': 'Proposed Programme Budget for 2026',
    'pko': 'Budget of Peacekeeping Operations 2025/26',
    'PPB 2026/Plan Outline': 'Plan Outline',
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
    </div>
  );

  // Helper function to find organ data by matching both short and long names
  const findOrganData = (organName: string): Organ | undefined => {
    return allOrgans.find(organ => 
      organ.short === organName || organ.long === organName
    );
  };

  const entityDropdownOptions: SearchableDropdownOption[] = entityOptions.map(entity => {
    const entityDetail = allEntities.find(e => e.entity === entity.name);
    const longName = entityDetail ? entityDetail.entity_long : undefined;
    return {
        value: entity.name,
        label: longName ? `${entity.name} – ${longName}` : entity.name,
    };
  });

  const organDropdownOptions: SearchableDropdownOption[] = [];
  const priorityOrgans = ["General Assembly", "Security Council", "ECOSOC"];
  
  organOptions.forEach((organ, index) => {
    const organData = findOrganData(organ.name);
    
    // For General Assembly and Security Council, just show the name
    if (organ.name === "General Assembly" || organ.name === "Security Council") {
      organDropdownOptions.push({
        value: organ.name,
        label: organ.name,
      });
    } else {
      // For all other organs, show "short – long" format
      const option = organData ? {
        value: organ.name,
        label: `${organData.short} – ${organData.long}`,
      } : {
        value: organ.name,
        label: organ.name,
      };
      organDropdownOptions.push(option);
    }
    
    // Add a very light divider after ECOSOC (the third priority organ)
    if (index === 2 && priorityOrgans.includes(organ.name)) {
      organDropdownOptions.push({
        value: "---divider---",
        label: "",
        description: "",
      });
    }
  });

  const dataCardsSection = (
    <section className="mb-6">
      <h2 className="text-2xl font-bold tracking-tight mb-3">{explainerTexts.dataCards.sectionTitle}</h2>
      <div className={`grid gap-3 ${showEntityCard ? 'grid-cols-1 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        <DataCard
          title={explainerTexts.dataCards.sourceDocuments.title}
          value={totalItems > 0 ? totalItems : '0'}
          icon={FileText}
          description={explainerTexts.dataCards.sourceDocuments.description}
          isLoading={isLoading}
          isOpen={sourceDocumentsPopover}
          onOpenChange={setSourceDocumentsPopover}
        />
        
        <DataCard
          title={explainerTexts.dataCards.unOrgans.title}
          value={uniqueOrgans > 0 ? uniqueOrgans : '0'}
          icon={Landmark}
          description={explainerTexts.dataCards.unOrgans.description}
          isLoading={isLoading}
          isOpen={unOrgansPopover}
          onOpenChange={setUnOrgansPopover}
        />
        
        {showEntityCard && (
          <DataCard
            title={explainerTexts.dataCards.unEntities.title}
            value={selectedEntity ? '1' : (uniqueEntities > 0 ? uniqueEntities : '0')}
            icon={Building}
            description={explainerTexts.dataCards.unEntities.description}
            isLoading={isLoading}
            isOpen={unEntitiesPopover}
            onOpenChange={setUnEntitiesPopover}
          />
        )}
        
        <DataCard
          title={selectedEntity ? explainerTexts.dataCards.citationsByEntity.title : explainerTexts.dataCards.citations.title}
          value={totalCitations > 0 ? totalCitations : '0'}
          icon={Quote}
          description={selectedEntity ? explainerTexts.dataCards.citationsByEntity.description : explainerTexts.dataCards.citations.description}
          isLoading={isLoading}
          isOpen={citationsPopover}
          onOpenChange={setCitationsPopover}
        />
      </div>
    </section>
  );

  return (
    <div className={className}>
      {dataCardsSection}

      <div className="mb-6">
        <FilterControls
          keyword={keyword}
          onKeywordChange={onKeywordChange}
          onKeywordSearch={onKeywordSearch}
          entityOptions={entityDropdownOptions}
          selectedEntity={selectedEntity}
          onEntityChange={onEntityChange}
          organOptions={organDropdownOptions}
          selectedOrgan={selectedOrgan}
          onOrganChange={onOrganChange}
          programme={programme}
          subject={subject}
          yearRange={yearRange}
          yearDistribution={yearDistribution}
          selectedYearRange={selectedYearRange}
          budgetDocument={budgetDocument}
          onProgrammeChange={onProgrammeChange}
          onSubjectChange={onSubjectChange}
          onYearRangeChange={handleYearRangeChange}
          onBudgetDocumentChange={onBudgetDocumentChange}
          programmeOptions={programmeOptions}
          subjectOptions={subjectOptions}
          disableEntityFilter={!!presetEntity}
        />
      </div>

      <div>
        <SearchResultsSummary
          totalResults={totalItems}
          searchKeyword={keywordFromParams}
          appliedFilters={{
            entity: selectedEntity !== 'all' ? selectedEntity : undefined,
            organ: selectedOrgan !== 'all' ? selectedOrgan : undefined,
            programme: programme || undefined,
            subject: subject || undefined,
            year: (startYearFromParams && endYearFromParams && yearRange && (parseInt(startYearFromParams, 10) !== yearRange.min || parseInt(endYearFromParams, 10) !== yearRange.max)) ? `${startYearFromParams}-${endYearFromParams}` : undefined,
            budget_document: budgetDocument && budgetDocument !== 'all' ? budgetDocumentDisplayNames[budgetDocument] : undefined,
            cross_entity: crossEntity || undefined,
          }}
          onClearSearch={() => {
            onKeywordChange('');
            onKeywordSearch('');
          }}
          onClearFilter={(filterKey) => {
            switch (filterKey) {
              case 'entity':
                if (!presetEntity) onEntityChange('all');
                break;
              case 'organ':
                onOrganChange('all');
                break;
              case 'programme':
                onProgrammeChange('');
                break;
              case 'subject':
                onSubjectChange('');
                break;
              case 'year':
                const newParams = new URLSearchParams(searchParams.toString());
                newParams.delete('start_year');
                newParams.delete('end_year');
                newParams.set('page', '1');
                router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
                break;
              case 'budget_document':
                onBudgetDocumentChange('all');
                break;
              case 'cross_entity':
                const crossEntityParams = new URLSearchParams(searchParams.toString());
                crossEntityParams.delete('cross_entity');
                crossEntityParams.set('page', '1');
                router.push(`${pathname}?${crossEntityParams.toString()}`, { scroll: false });
                break;
            }
          }}
          isLoading={isLoading}
        />
      </div>
      
      <div>
        <div className="mt-6 pt-4">
          {/* Main content with mandates list and cross-citations */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Mandates List */}
            <div className="flex-1">
              <div className="mb-4">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3">
                  {crossEntity && presetEntity 
                    ? `Shared Documents` 
                    : mandateListTitle || explainerTexts.mandateList.sectionTitle
                  }
                </h2>
                <div className="flex items-center gap-2 w-fit">
                  <label htmlFor="sort-by" className="text-sm font-medium text-nowrap">Sort by</label>
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-[290px]" id="sort-by">
                      <SelectValue placeholder={explainerTexts.sorting.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {keywordFromParams ? <SelectItem value="default">Search Relevance</SelectItem> : null}
                      <SelectItem value="citing_entities_desc">Number of citing entities (High to Low)</SelectItem>
                      <SelectItem value="citing_entities_asc">Number of citing entities (Low to High)</SelectItem>
                      <SelectItem value="citations_desc">Citations (High to Low)</SelectItem>
                      <SelectItem value="citations_asc">Citations (Low to High)</SelectItem>
                      <SelectItem value="year_desc">Year (Newest First)</SelectItem>
                      <SelectItem value="year_asc">Year (Oldest First)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {isLoading ? (
                <LoadingSkeleton />
              ) : (
                <MandateList
                  mandates={mandates}
                  onMandateClick={setSelectedMandate}
                  organsData={allOrgans}
                />
              )}
            </div>
            
            {/* Cross-Citations Section - only show when there's a preset entity */}
            {presetEntity && (
              <div className="w-full lg:w-80 flex-shrink-0">
                <CrossCitations 
                  currentEntity={presetEntity}
                  onEntityFilter={(entity) => {
                    // Add the selected entity as an additional filter
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('page', '1');
                    params.set('cross_entity', entity);
                    router.push(`${pathname}?${params.toString()}`, { scroll: false });
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          totalItems={totalItems}
        />
      </div>

      <MandateDetails
        mandate={selectedMandate}
        open={!!selectedMandate}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedMandate(null);
          }
        }}
        allEntities={allEntities}
      />
    </div>
  );
} 