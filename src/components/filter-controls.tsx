'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, ChevronUp, HelpCircle, FileText, Landmark, Building, Search } from 'lucide-react';
import { AdvancedSearch } from '@/components/advanced-search';
import { YearSlider } from './year-slider';
import { SearchableDropdown, SearchableDropdownOption } from '@/components/ui/searchable-dropdown';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from '@/components/ui/label';
import { explainerTexts } from '@/lib/explainer-texts';

interface FilterControlsProps {
  entityOptions: SearchableDropdownOption[];
  organOptions: SearchableDropdownOption[];
  programmeOptions: string[];
  selectedEntity: string;
  selectedOrgan: string;
  keyword: string;
  onEntityChange: (value: string) => void;
  onOrganChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onKeywordSearch?: (value?: string) => void; // New prop for Enter-based search
  programme: string;
  yearRange: { min: number; max: number } | null;
  yearDistribution: { [year: string]: number };
  selectedYearRange: [number, number] | null;
  budgetDocument: string;
  onProgrammeChange: (value: string) => void;
  onYearRangeChange: (value: [number, number]) => void;
  onBudgetDocumentChange: (value: string) => void;
}

export function FilterControls({
  entityOptions,
  organOptions,
  programmeOptions,
  selectedEntity,
  selectedOrgan,
  keyword,
  onEntityChange,
  onOrganChange,
  onKeywordChange,
  onKeywordSearch,
  programme,
  yearRange,
  yearDistribution,
  selectedYearRange,
  budgetDocument,
  onProgrammeChange,
  onYearRangeChange,
  onBudgetDocumentChange,
}: FilterControlsProps) {
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  return (
    <TooltipProvider>
      <div className="p-4 bg-dashboard-card border rounded-lg shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="keyword-search" className="text-base font-medium">{explainerTexts.filters.keywordSearch.label}</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{explainerTexts.filters.keywordSearch.tooltip}</p>
                </TooltipContent>
              </Tooltip>
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
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-medium">{explainerTexts.filters.unOrgan.label}</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{explainerTexts.filters.unOrgan.tooltip}</p>
                </TooltipContent>
              </Tooltip>
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

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-medium">{explainerTexts.filters.unEntity.label}</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{explainerTexts.filters.unEntity.tooltip}</p>
                </TooltipContent>
              </Tooltip>
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
        </div>

        <div className="flex justify-start">
          <Button variant="link" onClick={() => setShowAdvancedSearch(!showAdvancedSearch)} className="flex items-center gap-2">
            {showAdvancedSearch ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
            {showAdvancedSearch ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {showAdvancedSearch && (
          <AdvancedSearch
            programme={programme}
            budgetDocument={budgetDocument}
            onProgrammeChange={onProgrammeChange}
            onBudgetDocumentChange={onBudgetDocumentChange}
            programmeOptions={programmeOptions}
            yearRange={yearRange}
            yearDistribution={yearDistribution}
            selectedYearRange={selectedYearRange}
            onYearRangeChange={onYearRangeChange}
          />
        )}
      </div>
    </TooltipProvider>
  );
}