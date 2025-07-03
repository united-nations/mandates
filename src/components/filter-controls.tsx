'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, ChevronUp, HelpCircle, Search, Building, Landmark, Target, BookOpen, Calendar, Receipt, FileText } from 'lucide-react';
import { AdvancedSearch } from '@/components/advanced-search';
import { YearSlider } from './year-slider';
import { SearchableDropdown, SearchableDropdownOption } from '@/components/ui/searchable-dropdown';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EntityName } from './ui/entity-name';
import { toTitleCase } from '@/lib/utils';
import { explainerTexts } from '@/lib/explainer-texts';
import { useFilters } from '@/contexts/FilterContext';

interface FilterControlsProps {
  entityOptions: SearchableDropdownOption[];
  organOptions: SearchableDropdownOption[];
  programmeOptions: string[];
  subjectOptions: string[];
  yearRange: { min: number; max: number } | null;
  yearDistribution: { [year: string]: number };
  showAdvancedSearch: boolean;
  setShowAdvancedSearch: (show: boolean) => void;
}

export function FilterControls({
  entityOptions,
  organOptions,
  programmeOptions,
  subjectOptions,
  yearRange,
  yearDistribution,
  showAdvancedSearch,
  setShowAdvancedSearch,
}: FilterControlsProps) {
  const { 
    filters, 
    setFilter, 
    clearFilter, 
    clearAllFilters, 
    getDisplayFilters,
    isEntityPage,
    isOrganPage 
  } = useFilters();
  
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(filters.keyword || '');

  // Sync search input with filters when filters change externally (e.g., clear all)
  useEffect(() => {
    setSearchInput(filters.keyword || '');
  }, [filters.keyword]);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.tooltip-container')) {
        setOpenTooltip(null);
      }
    };

    if (openTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openTooltip]);

  const toggleTooltip = (tooltipId: string) => {
    setOpenTooltip(openTooltip === tooltipId ? null : tooltipId);
  };

  const handleSearch = () => {
    const trimmedValue = searchInput.trim();
    if (trimmedValue !== (filters.keyword || '').trim()) {
      setFilter('keyword', trimmedValue || undefined);
    }
  };

  const TooltipButton = ({ tooltipId, ariaLabel, tooltipText }: { 
    tooltipId: string; 
    ariaLabel: string; 
    tooltipText: string; 
  }) => (
    <div className="relative tooltip-container">
      <button 
        type="button"
        className="p-0 border-0 bg-transparent cursor-help focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-sm -ml-1 touch-manipulation"
        aria-label={ariaLabel}
        onClick={() => toggleTooltip(tooltipId)}
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
      </button>
      {openTooltip === tooltipId && (
        <div className="absolute right-0 top-6 z-50 w-64 p-3 bg-popover border rounded-md text-sm text-popover-foreground">
          <p>{tooltipText}</p>
        </div>
      )}
    </div>
  );

  // Get filters that should be displayed as chips (context-aware)
  const displayFilters = getDisplayFilters();
  const hasFilters = Object.values(displayFilters).some(value => value && value !== 'all');
  const hasSearch = filters.keyword && filters.keyword.trim().length > 0;

  // Convert year range to display format
  const yearRangeDisplay = filters.start_year && filters.end_year 
    ? `${filters.start_year}-${filters.end_year}`
    : null;

  const handleYearRangeChange = (range: [number, number]) => {
    setFilter('start_year', range[0].toString());
    setFilter('end_year', range[1].toString());
  };

  const selectedYearRange: [number, number] | null = 
    filters.start_year && filters.end_year 
      ? [parseInt(filters.start_year), parseInt(filters.end_year)]
      : null;

  return (
    <div className="">
      {/* Advanced Filters - Enhanced container (now above search bar) */}
      {showAdvancedSearch && (
        <div className="bg-white/50">
          <div className="p-6 pt-4">
            <AdvancedSearch
              programme={filters.programme || ''}
              subject={filters.subject || ''}
              budgetDocument={filters.budget_document || ''}
              onProgrammeChange={(value) => setFilter('programme', value)}
              onSubjectChange={(value) => setFilter('subject', value)}
              onBudgetDocumentChange={(value) => setFilter('budget_document', value)}
              programmeOptions={programmeOptions}
              subjectOptions={subjectOptions}
              yearRange={yearRange}
              yearDistribution={yearDistribution}
              selectedYearRange={selectedYearRange}
              onYearRangeChange={handleYearRangeChange}
            />
          </div>
        </div>
      )}
      {/* Search bar only in a row */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="keyword-search"
            placeholder={explainerTexts.filters.keywordSearch.placeholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            className="pl-10 pr-10 h-9 text-sm border-0 border-b border-muted bg-transparent focus-visible:ring-0 focus-visible:border-un-blue rounded-none"
          />
          {(searchInput || filters.keyword) && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-blue-100 rounded-full"
              onClick={() => {
                setSearchInput('');
                clearFilter('keyword');
              }}
              title="Clear search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter Chips - Enhanced styling */}
      {(hasSearch || hasFilters) && (
        <div className="border border-slate-200 rounded-md">
          <div className="p-6 pt-4">
            <div className="space-y-4">
              {/* Only show Active Filters label, count, and Clear All if there are visible chips or search */}
              {(hasSearch || Object.values(displayFilters).filter(v => v && v !== 'all').length > 0) && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">Active Filters</span>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {(hasSearch ? 1 : 0) + Object.values(displayFilters).filter(v => v && v !== 'all').length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    className="shrink-0 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    onClick={clearAllFilters}
                  >
                    <X className="h-4 w-4" />
                    Clear All
                  </Button>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                {hasSearch && (
                  <Badge variant="default" className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200">
                    <Search className="h-3 w-3" />
                    <span className="text-sm font-medium">"{filters.keyword}"</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-blue-300 rounded-full"
                      onClick={() => clearFilter('keyword')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {/* Entity chip - only show if not on entity page or if it's an additional filter */}
                {displayFilters.entity && displayFilters.entity !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200">
                    <Building className="h-3 w-3" />
                    <span className="text-sm font-medium">
                      Entity:&nbsp;
                      <EntityName entityName={displayFilters.entity} />
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-slate-300 rounded-full"
                      onClick={() => clearFilter('entity')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {/* Organ chip - only show if not on organ page or if it's an additional filter */}
                {displayFilters.organ && displayFilters.organ !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200">
                    <Landmark className="h-3 w-3" />
                    <span className="text-sm font-medium">Organ: {displayFilters.organ}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-slate-300 rounded-full"
                      onClick={() => clearFilter('organ')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {displayFilters.programme && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200">
                    <Target className="h-3 w-3" />
                    <span className="text-sm font-medium">Programme: {displayFilters.programme}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-slate-300 rounded-full"
                      onClick={() => clearFilter('programme')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {displayFilters.subject && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200">
                    <BookOpen className="h-3 w-3" />
                    <span className="text-sm font-medium">Subject: {toTitleCase(displayFilters.subject)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-slate-300 rounded-full"
                      onClick={() => clearFilter('subject')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {yearRangeDisplay && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm font-medium">Year: {yearRangeDisplay}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-slate-300 rounded-full"
                      onClick={() => {
                        clearFilter('start_year');
                        clearFilter('end_year');
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {displayFilters.budget_document && displayFilters.budget_document !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200">
                    <Receipt className="h-3 w-3" />
                    <span className="text-sm font-medium">Budget: {displayFilters.budget_document}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-slate-300 rounded-full"
                      onClick={() => clearFilter('budget_document')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {displayFilters.cross_entity && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200">
                    <Building className="h-3 w-3" />
                    <span className="text-sm font-medium">
                      Shared with:&nbsp;
                      <EntityName entityName={displayFilters.cross_entity} />
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-slate-300 rounded-full"
                      onClick={() => clearFilter('cross_entity')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}