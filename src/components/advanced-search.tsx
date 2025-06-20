'use client';

import { SearchableDropdown } from './ui/searchable-dropdown';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { HelpCircle, Calendar } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { YearSlider } from './year-slider';
import { explainerTexts } from '@/lib/explainer-texts';

interface AdvancedSearchProps {
  programme: string;
  budgetDocument: string;
  programmeOptions: string[];
  yearRange: { min: number; max: number } | null;
  yearDistribution: { [year: string]: number };
  selectedYearRange: [number, number] | null;
  onProgrammeChange: (value: string) => void;
  onBudgetDocumentChange: (value: string) => void;
  onYearRangeChange: (value: [number, number]) => void;
}

export function AdvancedSearch({
  programme,
  budgetDocument,
  programmeOptions,
  yearRange,
  yearDistribution,
  selectedYearRange,
  onProgrammeChange,
  onBudgetDocumentChange,
  onYearRangeChange,
}: AdvancedSearchProps) {

  const programmeDropdownOptions = programmeOptions.map(p => ({ value: p, label: p }));

  return (
    <TooltipProvider>
      <div className="border-t pt-4 mt-4 space-y-4">
          {/* Row 1: Programme and Budget Document */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">{explainerTexts.advancedFilters.programme.label}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{explainerTexts.advancedFilters.programme.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <SearchableDropdown 
                options={programmeDropdownOptions}
                value={programme}
                onChange={onProgrammeChange}
                placeholder={explainerTexts.advancedFilters.programme.placeholder}
                searchPlaceholder={explainerTexts.advancedFilters.programme.searchPlaceholder}
                emptyPlaceholder={explainerTexts.advancedFilters.programme.emptyPlaceholder}
                className="text-sm h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="budget-document" className="text-base font-medium">{explainerTexts.advancedFilters.budgetDocument.label}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{explainerTexts.advancedFilters.budgetDocument.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select 
                value={budgetDocument} 
                onValueChange={onBudgetDocumentChange}
              >
                <SelectTrigger id="budget-document" className="text-sm h-11">
                  <SelectValue placeholder={explainerTexts.advancedFilters.budgetDocument.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Budget Documents</SelectItem>
                  <SelectSeparator />
                  <SelectItem value="ppb2026">Proposed Programme Budget for 2026</SelectItem>
                  <SelectItem value="pko">Budget of Peacekeeping Operations 2025/26</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Row 2: Year Range */}
          {yearRange && selectedYearRange && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">{explainerTexts.advancedFilters.yearRange.label}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{explainerTexts.advancedFilters.yearRange.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <YearSlider
                yearDistribution={yearDistribution}
                yearRange={yearRange}
                value={selectedYearRange}
                onChange={onYearRangeChange}
              />
            </div>
          )}
      </div>
    </TooltipProvider>
  );
}
