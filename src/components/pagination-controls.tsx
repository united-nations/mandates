'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUrlFilters } from '@/hooks/use-url-filters';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  className?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  className = '',
}: PaginationControlsProps) {
  const { setFilter } = useUrlFilters();
  
  // Don't render if there's nothing to paginate
  if (totalPages <= 1 && totalItems <= pageSize) return null;

  const pageSizeOptions = [10, 20, 30, 50, 100, 1000];

  const handlePageChange = (page: number) => {
    setFilter('page', page.toString());
  };

  const handlePageSizeChange = (size: number) => {
    setFilter('limit', size.toString());
    // Page will be reset to 1 automatically by setFilter
  };

  return (
    <div className={`flex flex-col space-y-3 p-2 pt-1 md:flex-row md:items-center md:justify-between md:space-y-0 ${className}`}>
      {/* Page size selector */}
      <div className="flex items-center justify-center space-x-2 md:justify-start">
        <div className="text-sm text-muted-foreground">Rows per page</div>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => handlePageSizeChange(Number(value))}
        >
          <SelectTrigger className="w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] overflow-y-auto">
            {pageSizeOptions.map(size => (
              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
            ))}
            <SelectItem value={String(totalItems)}>All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Page navigation */}
      <div className="flex flex-col items-center space-y-2 md:flex-row md:space-y-0 md:space-x-4">
        <div className="text-sm text-muted-foreground text-center">
          Page {currentPage} of {totalPages} ({totalItems.toLocaleString()} items)
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
