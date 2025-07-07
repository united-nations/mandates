'use client';

import { FilterBadge } from '@/components/ui/filter-badge';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { EntityName } from './ui/entity-name';
import { toTitleCase } from '@/lib/utils';

interface SearchResultsSummaryProps {
  totalResults: number;
  searchKeyword?: string;
  appliedFilters: {
    entity?: string;
    organ?: string;
    programme?: string;
    subject?: string;
    pillar?: string;
    year?: string;
    budget_document?: string;
    cross_entity?: string;
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
    <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#F6F7F8' }}>
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {isLoading ? (
                'Searching...'
              ) : (
                <>
                  {totalResults.toLocaleString()} mandate source document{totalResults !== 1 ? 's' : ''} found
                  {hasSearch && hasFilters && ' with search and filters'}
                  {hasSearch && !hasFilters && ' for your search'}
                  {!hasSearch && hasFilters && ' with filters'}
                </>
              )}
            </span>

          </div>
          
          {(hasSearch || hasFilters) && (
            <Button
              variant="clear"
              className="shrink-0 inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1 sm:px-2.5 sm:py-1.5 h-auto !bg-trout !text-white hover:!bg-trout/90"
              onClick={() => {
                if (hasSearch) onClearSearch();
                Object.keys(appliedFilters).forEach(key => {
                  if (appliedFilters[key as keyof typeof appliedFilters]) {
                    onClearFilter(key);
                  }
                });
              }}
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Clear All</span>
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {hasSearch && (
            <FilterBadge
              icon={Search}
              label={`Search: "${searchKeyword}"`}
              onClear={onClearSearch}
              variant="default"
            />
          )}

          {appliedFilters.entity && appliedFilters.entity !== 'all' && (
            <FilterBadge
              label={<>Entity:&nbsp;<EntityName entityName={appliedFilters.entity} /></>}
              onClear={() => onClearFilter('entity')}
              variant="secondary"
            />
          )}

          {appliedFilters.organ && appliedFilters.organ !== 'all' && (
            <FilterBadge
              label={`Organ: ${appliedFilters.organ}`}
              onClear={() => onClearFilter('organ')}
              variant="secondary"
            />
          )}

          {appliedFilters.programme && (
            <FilterBadge
              label={`Programme: ${appliedFilters.programme}`}
              onClear={() => onClearFilter('programme')}
              variant="secondary"
            />
          )}

          {appliedFilters.subject && (
            <FilterBadge
              label={`Subject: ${toTitleCase(appliedFilters.subject)}`}
              onClear={() => onClearFilter('subject')}
              variant="secondary"
            />
          )}

          {appliedFilters.pillar && appliedFilters.pillar !== 'all' && (
            <FilterBadge
              label={`Pillar: ${appliedFilters.pillar}`}
              onClear={() => onClearFilter('pillar')}
              variant="secondary"
            />
          )}

          {appliedFilters.year && (
            <FilterBadge
              label={`Year: ${appliedFilters.year}`}
              onClear={() => onClearFilter('year')}
              variant="secondary"
            />
          )}

          {appliedFilters.budget_document && appliedFilters.budget_document !== 'all' && (
            <FilterBadge
              label={`Budget Doc: ${appliedFilters.budget_document}`}
              onClear={() => onClearFilter('budget_document')}
              variant="secondary"
            />
          )}

          {appliedFilters.cross_entity && (
            <FilterBadge
              label={<>Shared with:&nbsp;<EntityName entityName={appliedFilters.cross_entity} /></>}
              onClear={() => onClearFilter('cross_entity')}
              variant="secondary"
            />
          )}
        </div>
      </div>
  );
}
