'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, ChevronUp, HelpCircle, FileText, Landmark, Building } from 'lucide-react';
import { AdvancedSearch } from '@/components/advanced-search';
import { YearSlider } from './year-slider';
import { SearchableDropdown, SearchableDropdownOption, MultiSelectSearchableDropdown } from '@/components/ui/searchable-dropdown';
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
  programme: string;
  yearRange: { min: number; max: number } | null;
  yearDistribution: { [year: string]: number };
  selectedYearRange: [number, number] | null;
  budgetDocument: string;
  onProgrammeChange: (value: string) => void;
  onYearRangeChange: (value: [number, number]) => void;
  onBudgetDocumentChange: (value: string) => void;
  selectedEntities?: string[];
  selectedOrgans?: string[];
  onEntitiesChange?: (values: string[]) => void;
  onOrgansChange?: (values: string[]) => void;
  useMultiSelect?: boolean;
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
  programme,
  yearRange,
  yearDistribution,
  selectedYearRange,
  budgetDocument,
  onProgrammeChange,
  onYearRangeChange,
  onBudgetDocumentChange,
  selectedEntities = [],
  selectedOrgans = [],
  onEntitiesChange,
  onOrgansChange,
  useMultiSelect = true,
}: FilterControlsProps) {
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const handleEntityMultiSelectChange = (values: string[]) => {
    if (onEntitiesChange) {
      onEntitiesChange(values);
    }
  };

  const handleOrganMultiSelectChange = (values: string[]) => {
    if (onOrgansChange) {
      onOrgansChange(values);
    }
  };

  return (
    <TooltipProvider>
      <div className="p-4 bg-card border rounded-lg shadow-sm space-y-4">
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
            <div className="relative">
              <Input
                id="keyword-search"
                placeholder={explainerTexts.filters.keywordSearch.placeholder}
                value={keyword}
                onChange={(e) => onKeywordChange(e.target.value)}
                className="pr-10 text-sm h-11"
              />
              {keyword && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-1/2 -translate-y-1/2 h-full px-3"
                  onClick={() => onKeywordChange('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
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
            {useMultiSelect ? (
              <MultiSelectSearchableDropdown
                options={organOptions}
                values={selectedOrgans}
                onChange={handleOrganMultiSelectChange}
                placeholder={explainerTexts.filters.unOrgan.placeholder}
                searchPlaceholder={explainerTexts.filters.unOrgan.searchPlaceholder}
                emptyPlaceholder={explainerTexts.filters.unOrgan.emptyPlaceholder}
                className="text-sm h-11"
              />
            ) : (
              <SearchableDropdown
                options={organOptions}
                value={selectedOrgan}
                onChange={onOrganChange}
                placeholder={explainerTexts.filters.unOrgan.placeholder}
                searchPlaceholder={explainerTexts.filters.unOrgan.searchPlaceholder}
                emptyPlaceholder={explainerTexts.filters.unOrgan.emptyPlaceholder}
                className="text-sm h-11"
              />
            )}
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
            {useMultiSelect ? (
              <MultiSelectSearchableDropdown
                options={entityOptions}
                values={selectedEntities}
                onChange={handleEntityMultiSelectChange}
                placeholder={explainerTexts.filters.unEntity.placeholder}
                searchPlaceholder={explainerTexts.filters.unEntity.searchPlaceholder}
                emptyPlaceholder={explainerTexts.filters.unEntity.emptyPlaceholder}
                className="text-sm h-11"
              />
            ) : (
              <SearchableDropdown
                options={entityOptions}
                value={selectedEntity}
                onChange={onEntityChange}
                placeholder={explainerTexts.filters.unEntity.placeholder}
                searchPlaceholder={explainerTexts.filters.unEntity.searchPlaceholder}
                emptyPlaceholder={explainerTexts.filters.unEntity.emptyPlaceholder}
                className="text-sm h-11"
              />
            )}
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