'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, ChevronUp, HelpCircle, Search, Landmark, Building } from 'lucide-react';
import { AdvancedSearch } from '@/components/advanced-search';
import { YearSlider } from './year-slider';
import { SearchableDropdown, SearchableDropdownOption } from '@/components/ui/searchable-dropdown';
import { Label } from '@/components/ui/label';
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

  return (
    <div className="p-6 rounded-lg shadow-sm space-y-4" style={{ backgroundColor: '#F6F7F8' }}>
      <div className={`grid grid-cols-1 gap-6 ${disableEntityFilter ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="keyword-search" className="text-base font-medium">{explainerTexts.filters.keywordSearch.label}</Label>
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <TooltipButton 
              tooltipId="keywordSearch"
              ariaLabel="More information about keyword search"
              tooltipText={explainerTexts.filters.keywordSearch.tooltip}
            />
          </div>
          <div className="relative flex">
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
              className="pr-20 text-sm h-11"
            />
            <div className="absolute right-0 top-0 h-full flex">
              {keyword && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-full px-2"
                  onClick={() => onKeywordChange('')}
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-full px-3 text-muted-foreground hover:text-foreground"
                onClick={() => onKeywordSearch?.(keyword)}
                title="Search (or press Enter)"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-base font-medium">{explainerTexts.filters.unOrgan.label}</Label>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </div>
            <TooltipButton 
              tooltipId="unOrgan"
              ariaLabel="More information about UN organ filter"
              tooltipText={explainerTexts.filters.unOrgan.tooltip}
            />
          </div>
          <SearchableDropdown
            options={organOptions}
            value={selectedOrgan}
            onChange={onOrganChange}
            placeholder={explainerTexts.filters.unOrgan.placeholder}
            searchPlaceholder={explainerTexts.filters.unOrgan.searchPlaceholder}
            emptyPlaceholder={explainerTexts.filters.unOrgan.emptyPlaceholder}
            className="text-sm h-11"
          />
        </div>

        {!disableEntityFilter && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">{explainerTexts.filters.unEntity.label}</Label>
                <Building className="h-4 w-4 text-muted-foreground" />
              </div>
              <TooltipButton 
                tooltipId="unEntity"
                ariaLabel="More information about UN entity filter"
                tooltipText={explainerTexts.filters.unEntity.tooltip}
              />
            </div>
            <SearchableDropdown
              options={entityOptions}
              value={selectedEntity}
              onChange={onEntityChange}
              placeholder={explainerTexts.filters.unEntity.placeholder}
              searchPlaceholder={explainerTexts.filters.unEntity.searchPlaceholder}
              emptyPlaceholder={explainerTexts.filters.unEntity.emptyPlaceholder}
              className="text-sm h-11"
            />
          </div>
        )}
      </div>

      <div className="flex">
        <Button variant="link" onClick={() => setShowAdvancedSearch(!showAdvancedSearch)} className="flex items-center gap-2 px-0 text-left">
          {showAdvancedSearch ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
          {showAdvancedSearch ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {showAdvancedSearch && (
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
      )}
    </div>
  );
}