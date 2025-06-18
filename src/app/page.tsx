'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Mandate } from '@/types';
import { useDebounce } from '@/hooks/use-debounce'; 
import { MandateList } from '@/components/mandate-list';
import { FilterControls } from '@/components/filter-controls';
import { PaginationControls } from '@/components/pagination-controls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, FileText, Users, ListChecks, BookCopy, Building } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MandateDetails } from '@/components/mandate-details';

export default function MandateNavigatorPage() {
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedPriorityArea, setSelectedPriorityArea] = useState('');
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 300);

  const [entityOptions, setEntityOptions] = useState<string[]>([]);
  const [priorityAreaOptions, setPriorityAreaOptions] = useState<string[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [totalEntities, setTotalEntities] = useState(0);
  const [totalCitations, setTotalCitations] = useState(0);
  const [uniqueBodiesCount, setUniqueBodiesCount] = useState(0);
  const [uniqueBodies, setUniqueBodies] = useState<string[]>([]);

  const [selectedMandate, setSelectedMandate] = useState<Mandate | null>(null);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const response = await fetch('/api/mandates/meta');
        const data = await response.json();
        setEntityOptions(data.uniqueEntities || []);
        setPriorityAreaOptions(data.uniquePriorityAreas || []);
        setTotalDocuments(data.totalDocuments || 0);
        setTotalEntities(data.totalEntities || 0);
        setTotalCitations(data.totalCitations || 0);
        setUniqueBodiesCount(data.uniqueBodiesCount || 0);
        setUniqueBodies(data.uniqueBodies || []);
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
    if (selectedPriorityArea) params.append('priority_area', selectedPriorityArea);
    if (debouncedKeyword) params.append('keyword', debouncedKeyword);

    try {
      const response = await fetch(`/api/mandates?${params.toString()}`);
      const data = await response.json();
      setMandates(data.items || []);
      setTotalItems(data.totalItems || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      console.error("Failed to fetch mandates:", error);
      setMandates([]);
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, selectedEntity, selectedPriorityArea, debouncedKeyword]);
  
  useEffect(() => {
    fetchMandates();
  }, [fetchMandates]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEntity, selectedPriorityArea, debouncedKeyword, pageSize]);
  
  const LoadingSkeleton = () => (
    <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-6 px-4 md:px-8 border-b border-border">
        <div className="container mx-auto flex items-center gap-3">
          <Globe className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">
            UN Mandate Explorer
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-8 space-y-8">
        
        <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Data Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Popover>
                  <PopoverTrigger asChild>
                    <Card className="cursor-pointer">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
                          <FileText className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-3xl font-bold text-foreground">
                          {totalDocuments > 0 ? totalDocuments.toLocaleString() : <Skeleton className="h-8 w-32" />}
                          </div>
                      </CardContent>
                    </Card>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="p-4 text-sm">
                      A total of {totalDocuments.toLocaleString()} documents are cited as mandates within the proposed programme budget for 2026.
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Card className="cursor-pointer">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Citations</CardTitle>
                          <BookCopy className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-3xl font-bold text-foreground">
                              {totalCitations > 0 ? totalCitations.toLocaleString() : <Skeleton className="h-8 w-16" />}
                          </div>
                      </CardContent>
                    </Card>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="p-4 text-sm">
                      There are {totalCitations.toLocaleString()} references to one of the {totalDocuments.toLocaleString()} mandated documents within the proposed programme budget for 2026.
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Card className="cursor-pointer">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Entities</CardTitle>
                          <Users className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-3xl font-bold text-foreground">
                              {totalEntities > 0 ? totalEntities.toLocaleString() : <Skeleton className="h-8 w-16" />}
                          </div>
                      </CardContent>
                    </Card>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="p-4">
                      <p className="text-sm mb-4">{totalEntities.toLocaleString()} distinct UN entities are responsible for citing these documents.</p>
                      <ScrollArea className="h-72">
                        <h4 className="mb-4 text-sm font-medium leading-none">Entities</h4>
                        {entityOptions.map((entity) => (
                          <div key={entity} className="text-sm py-1">{entity}</div>
                        ))}
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Card className="cursor-pointer">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Organs</CardTitle>
                          <Building className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-3xl font-bold text-foreground">
                              {uniqueBodiesCount > 0 ? uniqueBodiesCount.toLocaleString() : <Skeleton className="h-8 w-16" />}
                          </div>
                      </CardContent>
                    </Card>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="p-4">
                      <p className="text-sm mb-4">{uniqueBodiesCount.toLocaleString()} distinct UN organs have issued the documents that are cited as mandates.</p>
                      <ScrollArea className="h-72">
                        <h4 className="mb-4 text-sm font-medium leading-none">Organs</h4>
                        {uniqueBodies.map((body) => (
                          <div key={body} className="text-sm py-1">{body}</div>
                        ))}
                      </ScrollArea>
                    </div>
                  </PopoverContent>
                </Popover>
            </div>
        </section>

        <section>
          <FilterControls
            entities={entityOptions}
            priorityAreas={priorityAreaOptions}
            selectedEntity={selectedEntity}
            selectedPriorityArea={selectedPriorityArea}
            keyword={keyword}
            onEntityChange={(value) => setSelectedEntity(value === 'all' ? '' : value)}
            onPriorityAreaChange={(value) => setSelectedPriorityArea(value === 'all' ? '' : value)}
            onKeywordChange={setKeyword}
            disabled={isLoading}
          />
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-foreground">
                Mandates ({isLoading ? '...' : totalItems.toLocaleString()})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <LoadingSkeleton /> : <MandateList mandates={mandates} onMandateClick={setSelectedMandate} />}
            </CardContent>
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          </Card>
        </section>
      </main>
      <MandateDetails
        mandate={selectedMandate}
        open={selectedMandate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMandate(null);
          }
        }}
      />
    </div>
  );
}
