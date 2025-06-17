'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Mandate } from '@/types';
import { useDebounce } from '@/hooks/use-debounce'; 
import { FilterControls } from '@/components/filter-controls';
import { MandateDetailsDialog } from '@/components/mandate-details-dialog';
import { MandateTable } from '@/components/mandate-table';
import { PaginationControls } from '@/components/pagination-controls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, FileText, Users, CalendarDays, ListChecks } from 'lucide-react';

// Helper function to extract year from date strings
function extractYear(publicationDate?: string, printingDate?: string): number {
  const dateStr = publicationDate || printingDate || '';
  const yearMatch = dateStr.match(/(\d{4})/);
  return yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
}

export default function MandateNavigatorPage() {
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter and pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 300);

  // Metadata for filters
  const [entityOptions, setEntityOptions] = useState<string[]>([]);
  const [yearOptions, setYearOptions] = useState<number[]>([]);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeMandate, setActiveMandate] = useState<Mandate | null>(null);

  const [recentYearCount, setRecentYearCount] = useState<number | null>(null);

  // Fetch metadata for filters on component mount
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const response = await fetch('/api/mandates/meta');
        const data = await response.json();
        setEntityOptions(data.uniqueEntities || []);
        setYearOptions(data.uniqueYears || []);
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
      }
    }
    fetchMetadata();
  }, []);

  // Fetch mandates when filters or pagination change
  const fetchMandates = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(itemsPerPage),
    });
    if (selectedEntity) params.append('entity', selectedEntity);
    if (selectedYear) params.append('year', selectedYear);
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
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, selectedEntity, selectedYear, debouncedKeyword]);
  
  useEffect(() => {
    fetchMandates();
  }, [fetchMandates]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEntity, selectedYear, debouncedKeyword, itemsPerPage]);

  const mostRecentYear = useMemo(() => {
    return yearOptions.length > 0 ? yearOptions[0] : new Date().getFullYear();
  }, [yearOptions]);

  useEffect(() => {
    if (yearOptions.length > 0) {
      const fetchRecentYearCount = async () => {
        try {
          const response = await fetch(`/api/mandates?year=${mostRecentYear}&limit=1`);
          const data = await response.json();
          setRecentYearCount(data.totalItems || 0);
        } catch (error) {
          console.error("Failed to fetch recent year count:", error);
          setRecentYearCount(0);
        }
      };
      fetchRecentYearCount();
    }
  }, [yearOptions, mostRecentYear]);

  const handleViewDetails = (mandate: Mandate) => {
    setActiveMandate(mandate);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setActiveMandate(null);
  };
  
  const handleClearFilters = () => {
    setSelectedEntity('');
    setSelectedYear('');
    setKeyword('');
  };
  
  const totalMandatesCount = useMemo(() => {
    // This is a bit of a trick. We use the totalItems from the last fetch.
    // A more robust solution might fetch this from a dedicated count endpoint.
    return totalItems > 0 ? totalItems : '...';
  }, [totalItems]);
  
  const uniqueEntitiesCount = useMemo(() => entityOptions.length, [entityOptions]);
  
  const LoadingSkeleton = () => (
    <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
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
        {/* Data Overview Section */}
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
                <p className="text-xs text-muted-foreground">Documents in PPB 2025</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">UN Entities</CardTitle>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                    {uniqueEntitiesCount > 0 ? uniqueEntitiesCount.toLocaleString() : <Skeleton className="h-8 w-16" />}
                </div>
                <p className="text-xs text-muted-foreground">Entities represented</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Recent ({mostRecentYear})</CardTitle>
                <ListChecks className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                 <div className="text-3xl font-bold text-foreground">
                    {recentYearCount !== null ? recentYearCount.toLocaleString() : <Skeleton className="h-8 w-24" />}
                </div>
                <p className="text-xs text-muted-foreground">Documents from most recent year</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Filter Mandates Section */}
        <section>
          <FilterControls
            entities={entityOptions}
            years={yearOptions}
            selectedEntity={selectedEntity}
            selectedYear={selectedYear}
            keyword={keyword}
            onEntityChange={setSelectedEntity}
            onYearChange={setSelectedYear}
            onKeywordChange={setKeyword}
            onClearFilters={handleClearFilters}
            disabled={isLoading}
          />
        </section>

        {/* Mandate List Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-foreground">
              Mandate Documents ({isLoading ? 'Loading...' : totalItems.toLocaleString()})
            </h2>
          </div>
          <div className="rounded-lg border shadow-sm bg-card">
            {isLoading ? (
                <LoadingSkeleton />
            ) : (
                <MandateTable
                mandates={mandates}
                onViewDetails={(mandateId) => {
                    const mandate = mandates.find(m => m.id === mandateId);
                    if (mandate) handleViewDetails(mandate);
                }}
                />
            )}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              totalItems={totalItems}
            />
          </div>
        </section>
      </main>

      <MandateDetailsDialog
        mandate={activeMandate}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
      />
    </div>
  );
}
