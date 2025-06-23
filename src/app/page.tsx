'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Mandate } from '@/types'; 
import { MandateList } from '@/components/mandate-list';
import { FilterControls } from '@/components/filter-controls';
import { PaginationControls } from '@/components/pagination-controls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Landmark, Building, Target, Quote, HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MandateDetails } from '@/components/mandate-details';
import { SearchResultsSummary } from '@/components/search-results-summary';
import { Button } from '@/components/ui/button';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SearchableDropdownOption } from '@/components/ui/searchable-dropdown';
import { explainerTexts } from '@/lib/explainer-texts';

interface ParentContext {
  scrollY: number;
  viewportHeight: number;
  iframeTop: number;
}

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
  const keywordFromParams = searchParams.get('keyword') || '';
  const programme = searchParams.get('programme') || '';
  const subject = searchParams.get('subject') || '';
  const startYearFromParams = searchParams.get('start_year');
  const endYearFromParams = searchParams.get('end_year');
  const budgetDocument = searchParams.get('budget_document') || '';
  const sortBy = searchParams.get('sort_by') || (keywordFromParams ? 'default' : 'citing_entities_desc');

  const [keyword, setKeyword] = useState(keywordFromParams);
  // Remove debounced search - we'll search on Enter instead
  
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

  const [parentContext, setParentContext] = useState<ParentContext | null>(null);

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
      post('setHeight', { height: document.documentElement.scrollHeight });
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
  }, [currentPage, pageSize, selectedEntity, selectedOrgan, keywordFromParams, programme, subject, startYearFromParams, endYearFromParams, budgetDocument, sortBy]);
  
  useEffect(() => {
    fetchMandates();
  }, [fetchMandates]);

  useEffect(() => {
    // Only sync keyword input with URL param changes (not trigger search)
    if (keywordFromParams !== keyword) {
      setKeyword(keywordFromParams);
    }
  }, [keywordFromParams]); // Remove 'keyword' from dependencies to prevent infinite loop
  
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

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <main className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto py-6 space-y-6 px-8 sm:px-12 lg:px-16">
          
          {/* Header with context info */}
          <section className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-6 mt-2">
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-x-2">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">
                      {explainerTexts.mainHeader.title}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-0">{explainerTexts.mainHeader.versionTag}</p>
                  </div>
                </div>
                <div className="text-muted-foreground mt-2 text-justify">
                  <p className="leading-tight mb-3">
                    {explainerTexts.mainHeader.shortDescription}{' '}
                    <Button
                      variant="link"
                      className="p-0 h-auto text-primary hover:text-primary/80 text-sm inline"
                      onClick={() => {
                        const element = document.getElementById('about-section');
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      Read More...
                    </Button>
                  </p>
                </div>
              </div>
            </div>
          </section>
        
        
          <section className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight mb-3">{explainerTexts.dataCards.sectionTitle}</h2>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-4">
                <Popover open={sourceDocumentsPopover} onOpenChange={setSourceDocumentsPopover}>
                  <PopoverTrigger asChild>
                    <div onMouseEnter={() => setSourceDocumentsPopover(true)} onMouseLeave={() => setSourceDocumentsPopover(false)} className="h-full">
                      <Card className="flex flex-col h-full cursor-help bg-dashboard-card">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-16">
                              <CardTitle className="text-lg font-medium text-secondary-foreground">{explainerTexts.dataCards.sourceDocuments.title}</CardTitle>
                              <FileText className="h-5 w-5 text-secondary-foreground" />
                          </CardHeader>
                          <CardContent className="flex-grow flex items-end">
                              <div className="text-3xl font-bold text-foreground">
                                  {isLoading ? <Skeleton className="h-8 w-16" /> : (totalItems > 0 ? totalItems.toLocaleString() : '0')}
                              </div>
                          </CardContent>
                      </Card>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <p className="font-medium">{explainerTexts.dataCards.sourceDocuments.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {explainerTexts.dataCards.sourceDocuments.description}
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Popover open={unOrgansPopover} onOpenChange={setUnOrgansPopover}>
                  <PopoverTrigger asChild>
                    <div onMouseEnter={() => setUnOrgansPopover(true)} onMouseLeave={() => setUnOrgansPopover(false)} className="h-full">
                      <Card className="flex flex-col h-full cursor-help bg-dashboard-card">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-16">
                            <CardTitle className="text-lg font-medium text-secondary-foreground">{explainerTexts.dataCards.unOrgans.title}</CardTitle>
                            <Landmark className="h-5 w-5 text-secondary-foreground" />
                        </CardHeader>
                        <CardContent className="flex-grow flex items-end">
                            <div className="text-3xl font-bold text-foreground">
                                {isLoading ? <Skeleton className="h-8 w-12" /> : (uniqueOrgans > 0 ? uniqueOrgans.toLocaleString() : '0')}
                            </div>
                        </CardContent>
                      </Card>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <p className="font-medium">{explainerTexts.dataCards.unOrgans.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {explainerTexts.dataCards.unOrgans.description}
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Popover open={unEntitiesPopover} onOpenChange={setUnEntitiesPopover}>
                  <PopoverTrigger asChild>
                    <div onMouseEnter={() => setUnEntitiesPopover(true)} onMouseLeave={() => setUnEntitiesPopover(false)} className="h-full">
                      <Card className="flex flex-col h-full cursor-help bg-dashboard-card">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-16">
                              <CardTitle className="text-lg font-medium text-secondary-foreground">{explainerTexts.dataCards.unEntities.title}</CardTitle>
                              <Building className="h-5 w-5 text-secondary-foreground" />
                          </CardHeader>
                          <CardContent className="flex-grow flex items-end">
                              <div className="text-3xl font-bold text-foreground">
                                  {isLoading ? <Skeleton className="h-8 w-16" /> : (selectedEntity ? '1' : (uniqueEntities > 0 ? uniqueEntities.toLocaleString() : '0'))}
                              </div>
                          </CardContent>
                      </Card>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <p className="font-medium">{explainerTexts.dataCards.unEntities.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {explainerTexts.dataCards.unEntities.description}
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Popover open={citationsPopover} onOpenChange={setCitationsPopover}>
                  <PopoverTrigger asChild>
                    <div onMouseEnter={() => setCitationsPopover(true)} onMouseLeave={() => setCitationsPopover(false)} className="h-full">
                      <Card className="flex flex-col h-full cursor-help bg-dashboard-card">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-16">
                              <CardTitle className="text-lg font-medium text-secondary-foreground">
                                {selectedEntity ? explainerTexts.dataCards.citationsByEntity.title : explainerTexts.dataCards.citations.title}
                              </CardTitle>
                              <Quote className="h-5 w-5 text-secondary-foreground" />
                          </CardHeader>
                          <CardContent className="flex-grow flex items-end">
                              <div className="text-3xl font-bold text-foreground">
                                  {isLoading ? <Skeleton className="h-8 w-20" /> : (totalCitations > 0 ? totalCitations.toLocaleString() : '0')}
                              </div>
                          </CardContent>
                      </Card>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <p className="font-medium">
                        {selectedEntity ? explainerTexts.dataCards.citationsByEntity.title : explainerTexts.dataCards.citations.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEntity ? explainerTexts.dataCards.citationsByEntity.description : explainerTexts.dataCards.citations.description}
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
            </div>
          </section>

          <div>
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
              }}
              onClearSearch={() => {
                onKeywordChange('');
                onKeywordSearch('');
              }}
              onClearFilter={(filterKey) => {
                switch (filterKey) {
                  case 'entity':
                    onEntityChange('all');
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
                }
              }}
              isLoading={isLoading}
            />
          </div>
          
          <div>
            <div className="mt-6 pt-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{explainerTexts.mandateList.sectionTitle}</h2>
                </div>
                <div className="flex items-center justify-end space-x-2 flex-shrink-0 sm:ml-auto">
                  <label htmlFor="sort-by" className="text-sm font-medium whitespace-nowrap">Sort by</label>
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-full sm:w-[290px] min-w-[220px]" id="sort-by">
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


          <section id="about-section" className="mt-16 pt-8">
            <div className="space-y-6 border-t pt-6">
              <h2 className="text-2xl font-bold tracking-tight">About the Registry</h2>
              <div className="text-muted-foreground space-y-4 text-justify">
                {explainerTexts.mainHeader.fullDescription.map((paragraph, index) => (
                  <p key={index} className="leading-relaxed">{paragraph}</p>
                ))}
              </div>
              <div>
                <p className="text-sm text-muted-foreground italic text-justify leading-relaxed">
                  {explainerTexts.mainHeader.disclaimer}
                </p>
              </div>
            </div>
          </section>
        </main>

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
    </TooltipProvider>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MandateNavigator />
    </Suspense>
  );
}
