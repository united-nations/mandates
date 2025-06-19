'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Mandate } from '@/types';
import { useDebounce } from '@/hooks/use-debounce'; 
import { MandateList } from '@/components/mandate-list';
import { FilterControls } from '@/components/filter-controls';
import { PaginationControls } from '@/components/pagination-controls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Archive, Landmark, Building, Target, Quote } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MandateDetails } from '@/components/mandate-details';
import { SearchResultsSummary } from '@/components/search-results-summary';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableDropdownOption } from '@/components/ui/searchable-dropdown';

interface ParentContext {
  scrollY: number;
  viewportHeight: number;
  iframeTop: number;
}

interface Entity {
  "Entity Short Name": string;
  "Entity Name": string;
}

function MandateNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const currentPage = Number(searchParams.get('page') || '1');
  const pageSize = Number(searchParams.get('limit') || '10');
  const selectedEntity = searchParams.get('entity') || '';
  const selectedOrgan = searchParams.get('organ') || '';
  const selectedPriorityArea = searchParams.get('priority_area') || '';
  const keywordFromParams = searchParams.get('keyword') || '';
  const programme = searchParams.get('programme') || '';
  const startYearFromParams = searchParams.get('start_year');
  const endYearFromParams = searchParams.get('end_year');
  const budgetDocument = searchParams.get('budget_document') || '';
  const section = searchParams.get('section') || '';
  const pillar = searchParams.get('pillar') || '';
  const sortBy = searchParams.get('sort_by') || (keywordFromParams ? 'default' : 'citations_desc');

  const [keyword, setKeyword] = useState(keywordFromParams);
  const debouncedKeyword = useDebounce(keyword, 300);
  
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const [uniqueOrgans, setUniqueOrgans] = useState(0);
  const [uniqueEntities, setUniqueEntities] = useState(0);
  const [totalCitations, setTotalCitations] = useState(0);
  const [uniqueProgrammes, setUniqueProgrammes] = useState(0);

  const [allEntities, setAllEntities] = useState<Entity[]>([]);
  const [entityOptions, setEntityOptions] = useState<string[]>([]);
  const [organOptions, setOrganOptions] = useState<string[]>([]);
  const [priorityAreaOptions, setPriorityAreaOptions] = useState<string[]>([]);
  const [programmeOptions, setProgrammeOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [pillarOptions, setPillarOptions] = useState<string[]>([]);

  const [yearDistribution, setYearDistribution] = useState<{ [year: string]: number }>({});
  const [yearRange, setYearRange] = useState<{ min: number; max: number } | null>(null);
  const [selectedYearRange, setSelectedYearRange] = useState<[number, number] | null>(null);

  const [selectedMandate, setSelectedMandate] = useState<Mandate | null>(null);

  const [parentContext, setParentContext] = useState<ParentContext | null>(null);

  const [sourceDocumentsPopover, setSourceDocumentsPopover] = useState(false);
  const [unOrgansPopover, setUnOrgansPopover] = useState(false);
  const [unEntitiesPopover, setUnEntitiesPopover] = useState(false);
  const [programmesPopover, setProgrammesPopover] = useState(false);
  const [citationsPopover, setCitationsPopover] = useState(false);

  useEffect(() => {
    // Sync keyword input with URL param
    if (keywordFromParams !== keyword) {
      setKeyword(keywordFromParams);
    }
  }, [keywordFromParams]);

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
    const FRAME_ORG = 'https://un80analytics.azurewebsites.net';

    if (window.parent === window) {
      return;
    }

    const post = (type: string, data = {}) => {
      // Allow posting to any parent origin, as per the example script.
      // The parent is responsible for verifying the origin.
      window.parent.postMessage({ type, ...data }, '*');
    };

    const reportHeight = () => {
      post('setHeight', { height: document.documentElement.scrollHeight + 200 });
    };

    const reportParams = () => {
      post('syncParams', { params: window.location.search });
    };

    // Initial report
    reportHeight();
    reportParams();

    // Report height on resize
    const resizeObserver = new ResizeObserver(reportHeight);
    resizeObserver.observe(document.documentElement);

    // Report params on URL changes
    window.addEventListener('popstate', reportParams);
    window.addEventListener('hashchange', reportParams);

    // Report params on internal navigation (clicks on links)
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href]');
      if (anchor && (anchor as HTMLAnchorElement).origin === window.location.origin) {
        setTimeout(reportParams, 50);
      }
    };
    document.addEventListener('click', handleDocClick);

    // Listen for messages from parent
    const handleMessage = (e: MessageEvent) => {
      // The sample child script does not check origin, assuming it's embedded by a trusted parent.
      // if (e.origin !== FRAME_ORG) return;
      
      const { type, params, ...context } = e.data || {};
      
      if (type === 'init' && typeof params === 'string' && params !== window.location.search) {
        const url = new URL(window.location.href);
        url.search = params;
        window.history.replaceState(null, '', url.toString());
        // The Next.js router might not pick up history.replaceState, 
        // but popstate should fire and update URL, which should trigger data-fetching useEffects
        // Let's manually trigger a re-render by using the router.
        router.replace(url.toString(), { scroll: false });
        reportParams();
        reportHeight();
      }
      
      if (type === 'pingHeight') {
        reportHeight();
      }

      if (type === 'parentContext') {
        const { scrollY, viewportHeight, iframeTop } = context;
        if (typeof scrollY === 'number' && typeof viewportHeight === 'number' && typeof iframeTop === 'number') {
          setParentContext({ scrollY, viewportHeight, iframeTop });
        }
      }
    };
    window.addEventListener('message', handleMessage);

    // When in an iframe, ask the parent for context.
    // The parent should listen for this message and respond with a 'parentContext' message.
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'requestParentContext' }, '*');
    }

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('popstate', reportParams);
      window.removeEventListener('hashchange', reportParams);
      document.removeEventListener('click', handleDocClick);
      window.removeEventListener('message', handleMessage);
    };
  }, [router]);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const response = await fetch('/api/mandates/meta');
        const data = await response.json();
        setEntityOptions(data.uniqueEntities || []);
        setOrganOptions(data.uniqueBodies || []);
        setPriorityAreaOptions(data.uniquePriorityAreas || []);
        setPillarOptions(data.uniquePillars || []);
        
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
        setUniqueProgrammes(data.uniqueProgrammesCount || 0);
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
    if (selectedPriorityArea) params.append('priority_area', selectedPriorityArea);
    if (keywordFromParams) params.append('keyword', keywordFromParams);
    if (programme) params.append('programme', programme);
    if (startYearFromParams) params.append('start_year', startYearFromParams);
    if (endYearFromParams) params.append('end_year', endYearFromParams);
    if (budgetDocument) params.append('budget_document', budgetDocument);
    if (section) params.append('section', section);
    if (pillar) params.append('pillar', pillar);
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
      setUniqueProgrammes(data.uniqueProgrammesCount || 0);

      if (data.uniqueProgrammes) {
        setProgrammeOptions(data.uniqueProgrammes);
      }
      if (data.uniqueSections) {
        setSectionOptions(data.uniqueSections);
      }
    } catch (error) {
      console.error("Failed to fetch mandates:", error);
      setMandates([]);
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, selectedEntity, selectedOrgan, selectedPriorityArea, keywordFromParams, programme, startYearFromParams, endYearFromParams, budgetDocument, section, pillar, sortBy]);
  
  useEffect(() => {
    fetchMandates();
  }, [fetchMandates]);

  useEffect(() => {
    if (debouncedKeyword !== keywordFromParams) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', '1');
      if (debouncedKeyword) {
        params.set('keyword', debouncedKeyword);
      } else {
        params.delete('keyword');
        // When clearing search, if sort was relevance, reset to default (citations)
        if (params.get('sort_by') === 'default') {
          params.set('sort_by', 'citations_desc');
        }
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [debouncedKeyword, keywordFromParams, pathname, router, searchParams]);
  
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
  const handlePriorityAreaChange = (value: string) => handleFilterChange('priority_area', value);
  const onProgrammeChange = (value: string) => handleFilterChange('programme', value);
  const onBudgetDocumentChange = (value: string) => handleFilterChange('budget_document', value);
  const onSectionChange = (value: string) => handleFilterChange('section', value);
  const onPillarChange = (value: string) => handleFilterChange('pillar', value);

  const onKeywordChange = (value: string) => {
    setKeyword(value);
  };

  const budgetDocumentDisplayNames: { [key: string]: string } = {
    ppb2026: 'Proposed Programme Budget for 2026',
    pko: 'Budget of Peacekeeping Operations 2025/26',
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
    </div>
  );

  useEffect(() => {
    // When mandates data changes, the height of the document might change.
    if (!isLoading) {
      const reportHeight = () => {
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'setHeight', height: document.documentElement.scrollHeight + 200 }, '*');
        }
      };
      // A small delay to allow the DOM to update
      const timer = setTimeout(reportHeight, 100);
      return () => clearTimeout(timer);
    }
  }, [mandates, isLoading]);

  const entityDropdownOptions: SearchableDropdownOption[] = entityOptions.map(shortName => {
    const entityDetail = allEntities.find(e => e["Entity Short Name"] === shortName);
    return {
        value: shortName,
        label: shortName,
        description: entityDetail ? entityDetail["Entity Name"] : undefined
    };
  });

  const organDropdownOptions: SearchableDropdownOption[] = organOptions.map(organ => ({
    value: organ,
    label: organ,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="w-full py-6 space-y-6">
        
        <section className="mb-6 px-4">
          <div className="grid gap-3 grid-cols-5">
              <Popover open={sourceDocumentsPopover} onOpenChange={setSourceDocumentsPopover}>
                <PopoverTrigger asChild>
                  <div onMouseEnter={() => setSourceDocumentsPopover(true)} onMouseLeave={() => setSourceDocumentsPopover(false)} className="h-full">
                    <Card className="flex flex-col h-full">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 h-14">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Source Documents</CardTitle>
                            <Archive className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="flex-grow flex items-end">
                            <div className="text-2xl font-bold text-foreground">
                                {isLoading ? <Skeleton className="h-6 w-12" /> : (totalItems > 0 ? totalItems.toLocaleString() : '0')}
                            </div>
                        </CardContent>
                    </Card>
                  </div>
                </PopoverTrigger>
                <PopoverContent>
                  <p className="text-sm">The total number of unique source documents in the registry.</p>
                </PopoverContent>
              </Popover>
              <Popover open={unOrgansPopover} onOpenChange={setUnOrgansPopover}>
                <PopoverTrigger asChild>
                  <div onMouseEnter={() => setUnOrgansPopover(true)} onMouseLeave={() => setUnOrgansPopover(false)} className="h-full">
                    <Card className="flex flex-col h-full">
                      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 h-14">
                          <CardTitle className="text-sm font-medium text-muted-foreground">UN Organs</CardTitle>
                          <Landmark className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="flex-grow flex items-end">
                          <div className="text-2xl font-bold text-foreground">
                              {isLoading ? <Skeleton className="h-6 w-12" /> : (uniqueOrgans > 0 ? uniqueOrgans.toLocaleString() : '0')}
                          </div>
                      </CardContent>
                    </Card>
                  </div>
                </PopoverTrigger>
                <PopoverContent>
                  <p className="text-sm">The number of distinct UN organs that have issued the documents.</p>
                </PopoverContent>
              </Popover>
              <Popover open={unEntitiesPopover} onOpenChange={setUnEntitiesPopover}>
                <PopoverTrigger asChild>
                  <div onMouseEnter={() => setUnEntitiesPopover(true)} onMouseLeave={() => setUnEntitiesPopover(false)} className="h-full">
                    <Card className="flex flex-col h-full">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 h-14">
                            <CardTitle className="text-sm font-medium text-muted-foreground">UN Entities</CardTitle>
                            <Building className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="flex-grow flex items-end">
                            <div className="text-2xl font-bold text-foreground">
                                {isLoading ? <Skeleton className="h-6 w-12" /> : (uniqueEntities > 0 ? uniqueEntities.toLocaleString() : '0')}
                            </div>
                        </CardContent>
                    </Card>
                  </div>
                </PopoverTrigger>
                <PopoverContent>
                  <p className="text-sm">The number of distinct UN entities mentioned in the documents.</p>
                </PopoverContent>
              </Popover>
              <Popover open={programmesPopover} onOpenChange={setProgrammesPopover}>
                <PopoverTrigger asChild>
                  <div onMouseEnter={() => setProgrammesPopover(true)} onMouseLeave={() => setProgrammesPopover(false)} className="h-full">
                    <Card className="flex flex-col h-full">
                      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 h-14">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Programmes</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent className="flex-grow flex items-end">
                        <div className="text-2xl font-bold text-foreground">
                          {isLoading ? <Skeleton className="h-6 w-12" /> : (uniqueProgrammes > 0 ? uniqueProgrammes.toLocaleString() : '0')}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </PopoverTrigger>
                <PopoverContent>
                  <p className="text-sm">The number of distinct programmes associated with the documents.</p>
                </PopoverContent>
              </Popover>
              <Popover open={citationsPopover} onOpenChange={setCitationsPopover}>
                <PopoverTrigger asChild>
                  <div onMouseEnter={() => setCitationsPopover(true)} onMouseLeave={() => setCitationsPopover(false)} className="h-full">
                    <Card className="flex flex-col h-full">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 h-14">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Citations</CardTitle>
                            <Quote className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="flex-grow flex items-end">
                            <div className="text-2xl font-bold text-foreground">
                                {isLoading ? <Skeleton className="h-6 w-12" /> : (totalCitations > 0 ? totalCitations.toLocaleString() : '0')}
                            </div>
                        </CardContent>
                    </Card>
                  </div>
                </PopoverTrigger>
                <PopoverContent>
                  <p className="text-sm">The total number of citations (mentions of entities) within the documents.</p>
                </PopoverContent>
              </Popover>
          </div>
        </section>

        <div className="px-4">
          <FilterControls
            keyword={keyword}
            onKeywordChange={onKeywordChange}
            entityOptions={entityDropdownOptions}
            selectedEntity={selectedEntity}
            onEntityChange={onEntityChange}
            organOptions={organDropdownOptions}
            selectedOrgan={selectedOrgan}
            onOrganChange={onOrganChange}
            priorityAreaOptions={priorityAreaOptions}
            selectedPriorityArea={selectedPriorityArea}
            onPriorityAreaChange={handlePriorityAreaChange}
            programme={programme}
            yearRange={yearRange}
            yearDistribution={yearDistribution}
            selectedYearRange={selectedYearRange}
            budgetDocument={budgetDocument}
            section={section}
            onProgrammeChange={onProgrammeChange}
            onYearRangeChange={handleYearRangeChange}
            onBudgetDocumentChange={onBudgetDocumentChange}
            onSectionChange={onSectionChange}
            programmeOptions={programmeOptions}
            sectionOptions={sectionOptions}
            pillarOptions={pillarOptions}
            selectedPillar={pillar}
            onPillarChange={onPillarChange}
          />
        </div>

        <div className="px-4">
          <SearchResultsSummary
            totalResults={totalItems}
            searchKeyword={keywordFromParams}
            appliedFilters={{
              entity: selectedEntity !== 'all' ? selectedEntity : undefined,
              organ: selectedOrgan !== 'all' ? selectedOrgan : undefined,
              priority_area: selectedPriorityArea !== 'all' ? selectedPriorityArea : undefined,
              programme: programme || undefined,
              pillar: pillar !== 'all' ? pillar : undefined,
              year: (startYearFromParams && endYearFromParams && yearRange && (parseInt(startYearFromParams, 10) !== yearRange.min || parseInt(endYearFromParams, 10) !== yearRange.max)) ? `${selectedYearRange?.[0]}-${selectedYearRange?.[1]}` : undefined,
              budget_document: budgetDocument && budgetDocument !== 'all' ? budgetDocumentDisplayNames[budgetDocument] : undefined,
              section: section || undefined,
            }}
            onClearSearch={() => onKeywordChange('')}
            onClearFilter={(filterKey) => {
              switch (filterKey) {
                case 'entity':
                  onEntityChange('all');
                  break;
                case 'organ':
                  onOrganChange('all');
                  break;
                case 'priority_area':
                  handlePriorityAreaChange('all');
                  break;
                case 'programme':
                  onProgrammeChange('');
                  break;
                case 'pillar':
                  onPillarChange('all');
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
                case 'section':
                  onSectionChange('');
                  break;
              }
            }}
            isLoading={isLoading}
          />
        </div>

        <div className="px-4">
          <div className="border-t border-border pt-4">
            <div className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold tracking-tight">Mandate Source Documents</h2>
                <div className="flex items-center space-x-2">
                  <label htmlFor="sort-by" className="text-sm font-medium">Sort by</label>
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-[200px]" id="sort-by">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                      {keywordFromParams ? <SelectItem value="default">Relevance</SelectItem> : null}
                      <SelectItem value="citations_desc">Citations (High to Low)</SelectItem>
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
                />
              )}
            </div>
          </div>
        </div>

        <div className="px-4">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            totalItems={totalItems}
          />
        </div>
      </main>

      <MandateDetails
        mandate={selectedMandate}
        open={!!selectedMandate}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedMandate(null);
          }
        }}
        parentContext={parentContext}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MandateNavigator />
    </Suspense>
  );
}
