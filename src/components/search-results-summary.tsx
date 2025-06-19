'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, X, Filter } from 'lucide-react';

interface SearchResultsSummaryProps {
  totalResults: number;
  searchKeyword?: string;
  appliedFilters: {
    entity?: string;
    organ?: string;
    priority_area?: string;
    programme?: string;
    year?: string;
    budget_document?: string;
    section?: string;
  };
  onClearSearch: () => void;
  onClearFilter: (filterKey: string) => void;
  isLoading: boolean;
}

export function SearchResultsSummary({
  totalResults,
  searchKeyword,
  appliedFilters,
  onClearSearch,
  onClearFilter,
  isLoading
}: SearchResultsSummaryProps) {
  const hasFilters = Object.values(appliedFilters).some(value => value && value !== 'all');
  const hasSearch = searchKeyword && searchKeyword.trim().length > 0;

  if (!hasSearch && !hasFilters) return null;

  return (
    <div className="bg-muted/50 border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {isLoading ? (
              'Searching...'
            ) : (
              <>
                {totalResults.toLocaleString()} result{totalResults !== 1 ? 's' : ''} found
                {hasSearch && hasFilters && ' with search and filters'}
                {hasSearch && !hasFilters && ' for your search'}
                {!hasSearch && hasFilters && ' with filters'}
              </>
            )}
          </span>
        </div>
        
        {(hasSearch || hasFilters) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (hasSearch) onClearSearch();
              Object.keys(appliedFilters).forEach(key => {
                if (appliedFilters[key as keyof typeof appliedFilters]) {
                  onClearFilter(key);
                }
              });
            }}
            className="text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {hasSearch && (
          <Badge variant="default" className="flex items-center gap-1">
            Search: "{searchKeyword}"
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={onClearSearch}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {appliedFilters.entity && appliedFilters.entity !== 'all' && (
          <Badge variant="secondary" className="flex items-center gap-1">
            Entity: {appliedFilters.entity}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => onClearFilter('entity')}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {appliedFilters.organ && appliedFilters.organ !== 'all' && (
          <Badge variant="secondary" className="flex items-center gap-1">
            Organ: {appliedFilters.organ}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => onClearFilter('organ')}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {appliedFilters.priority_area && appliedFilters.priority_area !== 'all' && (
          <Badge variant="secondary" className="flex items-center gap-1">
            Priority: {appliedFilters.priority_area}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => onClearFilter('priority_area')}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {appliedFilters.programme && (
          <Badge variant="secondary" className="flex items-center gap-1">
            Programme: {appliedFilters.programme}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => onClearFilter('programme')}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {appliedFilters.year && (
          <Badge variant="secondary" className="flex items-center gap-1">
            Year: {appliedFilters.year}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => onClearFilter('year')}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {appliedFilters.budget_document && appliedFilters.budget_document !== 'all' && (
          <Badge variant="secondary" className="flex items-center gap-1">
            Budget Doc: {appliedFilters.budget_document}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => onClearFilter('budget_document')}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}

        {appliedFilters.section && (
          <Badge variant="secondary" className="flex items-center gap-1">
            Section: {appliedFilters.section}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => onClearFilter('section')}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}
      </div>
    </div>
  );
}
