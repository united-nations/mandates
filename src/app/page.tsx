'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Mandate } from '@/types';
import { useDebounce } from '@/hooks/use-debounce'; 
import { MandateList } from '@/components/mandate-list';
import { FilterControls } from '@/components/filter-controls';
import { PaginationControls } from '@/components/pagination-controls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, FileText, Users, ListChecks } from 'lucide-react';

export default function MandateNavigatorPage() {
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Filter state
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedPriorityArea, setSelectedPriorityArea] = useState('');
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 300);

  // Metadata for filters
  const [entityOptions, setEntityOptions] = useState<string[]>([]);
  const [priorityAreaOptions, setPriorityAreaOptions] = useState<string[]>([]);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const response = await fetch('/api/mandates/meta');
        const data = await response.json();
        setEntityOptions(data.uniqueEntities || []);
        setPriorityAreaOptions(data.uniquePriorityAreas || []);
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
        limit: '100',
    });
    if (selectedEntity && selectedEntity !== 'all') params.append('entity', selectedEntity);
    if (selectedPriorityArea && selectedPriorityArea !== 'all') params.append('priority_area', selectedPriorityArea);
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
  }, [currentPage, selectedEntity, selectedPriorityArea, debouncedKeyword]);
  
  useEffect(() => {
    fetchMandates();
  }, [fetchMandates]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEntity, selectedPriorityArea, debouncedKeyword]);


  const handleClearFilters = () => {
    setSelectedEntity('');
    setSelectedPriorityArea('');
    setKeyword('');
  };
  
  const LoadingSkeleton = () => (
    <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Mandates</CardTitle>
                    <FileText className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                    {isLoading && totalItems === 0 ? <Skeleton className="h-8 w-32" /> : totalItems.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Across all entities and priority areas</p>
                </CardContent>
                </Card>
                <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">UN Entities</CardTitle>
                    <Users className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                        {entityOptions.length > 0 ? entityOptions.length.toLocaleString() : <Skeleton className="h-8 w-16" />}
                    </div>
                    <p className="text-xs text-muted-foreground">Entities represented in the dataset</p>
                </CardContent>
                </Card>
                <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Priority Areas</CardTitle>
                    <ListChecks className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-foreground">
                        {priorityAreaOptions.length > 0 ? priorityAreaOptions.length.toLocaleString() : <Skeleton className="h-8 w-16" />}
                    </div>
                    <p className="text-xs text-muted-foreground">Thematic areas covered</p>
                </CardContent>
                </Card>
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
            onClearFilters={handleClearFilters}
            disabled={isLoading}
          />
        </section>

        <section>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-foreground">
                Mandates ({isLoading ? '...' : totalItems.toLocaleString()})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <LoadingSkeleton /> : <MandateList mandates={mandates} />}
            </CardContent>
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
            />
          </Card>
        </section>
      </main>
    </div>
  );
}
