'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, ChevronUp, HelpCircle, Search, Building, Landmark, Target, BookOpen, Calendar, Receipt } from 'lucide-react';
import { AdvancedSearch } from '@/components/advanced-search';
import { YearSlider } from './year-slider';
import { SearchableDropdown, SearchableDropdownOption } from '@/components/ui/searchable-dropdown';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EntityName } from './ui/entity-name';
import { toTitleCase } from '@/lib/utils';
import { explainerTexts } from '@/lib/explainer-texts';

interface FilterControlsProps {
  entityOptions: SearchableDropdownOption[];
  organOptions: SearchableDropdownOption[];
  programmeOptions: string[];
  subjectOptions: string[];
  selectedEntity: string;
  selectedOrgan: string;
  keyword: string;
  onEntityChange: (value: string) => void;
  onOrganChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onKeywordSearch?: (value?: string) => void; // New prop for Enter-based search
  programme: string;
  subject: string;
  yearRange: { min: number; max: number } | null;
  yearDistribution: { [year: string]: number };
  selectedYearRange: [number, number] | null;
  budgetDocument: string;
  onProgrammeChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onYearRangeChange: (value: [number, number]) => void;
  onBudgetDocumentChange: (value: string) => void;
  disableEntityFilter?: boolean;
  // New props for filter chips
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
  onClearFilter: (filterKey: string) => void;
  onClearSearch: () => void;
}

export function FilterControls({
  entityOptions,
  organOptions,
  programmeOptions,
  subjectOptions,
  selectedEntity,
  selectedOrgan,
  keyword,
  onEntityChange,
  onOrganChange,
  onKeywordChange,
  onKeywordSearch,
  programme,
  subject,
  yearRange,
  yearDistribution,
  selectedYearRange,
  budgetDocument,
  onProgrammeChange,
  onSubjectChange,
  onYearRangeChange,
  onBudgetDocumentChange,
  disableEntityFilter = false,
  appliedFilters,
  onClearFilter,
  onClearSearch,
}: FilterControlsProps) {
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);

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
        <div className="absolute right-0 top-6 z-50 w-64 p-3 bg-popover border rounded-md shadow-md text-sm text-popover-foreground">
          <p>{tooltipText}</p>
        </div>
      )}
    </div>
  );

  const hasFilters = Object.values(appliedFilters).some(value => value && value !== 'all');
  const hasSearch = keyword && keyword.trim().length > 0;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header section with search */}
      <div className="p-6 pb-4">
        <div className="space-y-4">
          {/* Keyword Search - Enhanced layout */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-x-2">
                  <Label htmlFor="keyword-search" className="text-base font-semibold text-slate-900">{explainerTexts.filters.keywordSearch.label}</Label>
                  <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200'>
                    {explainerTexts.filters.keywordSearch.betaTag}
                  </span>
                </div>
                <Search className="h-4 w-4 text-slate-500" />
              </div>
              <TooltipButton 
                tooltipId="keywordSearch"
                ariaLabel="More information about keyword search"
                tooltipText={explainerTexts.filters.keywordSearch.tooltip}
              />
            </div>
            <div className="relative">
              <Input
                id="keyword-search"
                placeholder={explainerTexts.filters.keywordSearch.placeholder}
                value={keyword}
                onChange={(e) => onKeywordChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onKeywordSearch?.(keyword);
                  }
                }}
                className="pr-20 text-sm h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white shadow-sm"
              />
              <div className="absolute right-0 top-0 h-full flex">
                {keyword && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-full px-3 hover:bg-slate-100"
                    onClick={() => onKeywordChange('')}
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-full px-4 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  onClick={() => onKeywordSearch?.(keyword)}
                  title="Search (or press Enter)"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Advanced Filters Toggle - Enhanced styling */}
          <div className="flex items-center pt-2">
            <Button 
              variant="ghost" 
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)} 
              className="flex items-center gap-2 px-0 text-left text-slate-600 hover:text-slate-900 hover:bg-transparent"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {showAdvancedSearch ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
                </span>
                {showAdvancedSearch ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Filters - Enhanced container */}
      {showAdvancedSearch && (
        <div className="border-t border-slate-200 bg-white/50">
          <div className="p-6 pt-4">
            <AdvancedSearch
              programme={programme}
              subject={subject}
              budgetDocument={budgetDocument}
              onProgrammeChange={onProgrammeChange}
              onSubjectChange={onSubjectChange}
              onBudgetDocumentChange={onBudgetDocumentChange}
              programmeOptions={programmeOptions}
              subjectOptions={subjectOptions}
              yearRange={yearRange}
              yearDistribution={yearDistribution}
              selectedYearRange={selectedYearRange}
              onYearRangeChange={onYearRangeChange}
            />
          </div>
        </div>
      )}

      {/* Filter Chips - Enhanced styling */}
      {(hasSearch || hasFilters) && (
        <div className="border-t border-slate-200 bg-white/50">
          <div className="p-6 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">Active Filters</span>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    {(hasSearch ? 1 : 0) + Object.values(appliedFilters).filter(v => v && v !== 'all').length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  className="shrink-0 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  onClick={() => {
                    if (hasSearch) onClearSearch();
                    Object.keys(appliedFilters).forEach(key => {
                      if (appliedFilters[key as keyof typeof appliedFilters]) {
                        onClearFilter(key);
                      }
                    });
                  }}
                >
                  <X className="h-4 w-4" />
                  Clear All
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {hasSearch && (
                  <Badge variant="default" className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200">
                    <Search className="h-3 w-3" />
                    <span className="text-sm font-medium">"{keyword}"</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-blue-300 rounded-full"
                      onClick={onClearSearch}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {appliedFilters.entity && appliedFilters.entity !== 'all' && !disableEntityFilter && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200">
                    <Building className="h-3 w-3" />
                    <span className="text-sm font-medium">
                      Entity:&nbsp;
                      <EntityName entityName={appliedFilters.entity} />
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-slate-300 rounded-full"
                      onClick={() => onClearFilter('entity')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {appliedFilters.organ && appliedFilters.organ !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200">
                    <Landmark className="h-3 w-3" />
                    <span className="text-sm font-medium">Organ: {appliedFilters.organ}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-slate-300 rounded-full"
                      onClick={() => onClearFilter('organ')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {appliedFilters.programme && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200">
                    <Target className="h-3 w-3" />
                    <span className="text-sm font-medium">Programme: {appliedFilters.programme}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-slate-300 rounded-full"
                      onClick={() => onClearFilter('programme')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {appliedFilters.subject && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200">
                    <BookOpen className="h-3 w-3" />
                    <span className="text-sm font-medium">Subject: {toTitleCase(appliedFilters.subject)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-slate-300 rounded-full"
                      onClick={() => onClearFilter('subject')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {appliedFilters.year && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm font-medium">Year: {appliedFilters.year}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-slate-300 rounded-full"
                      onClick={() => onClearFilter('year')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {appliedFilters.budget_document && appliedFilters.budget_document !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200">
                    <Receipt className="h-3 w-3" />
                    <span className="text-sm font-medium">Budget: {appliedFilters.budget_document}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-slate-300 rounded-full"
                      onClick={() => onClearFilter('budget_document')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {appliedFilters.cross_entity && (
                  <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200">
                    <Building className="h-3 w-3" />
                    <span className="text-sm font-medium">
                      Shared with:&nbsp;
                      <EntityName entityName={appliedFilters.cross_entity} />
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-slate-300 rounded-full"
                      onClick={() => onClearFilter('cross_entity')}
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