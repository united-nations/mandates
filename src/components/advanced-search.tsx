'use client';

import { SearchableDropdown } from './ui/searchable-dropdown';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { explainerTexts } from '@/lib/explainer-texts';

interface AdvancedSearchProps {
  programme: string;
  budgetDocument: string;
  section: string;
  priorityAreaOptions: string[];
  programmeOptions: string[];
  sectionOptions: string[];
  selectedPriorityArea: string;
  onProgrammeChange: (value: string) => void;
  onBudgetDocumentChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onPriorityAreaChange: (value: string) => void;
}

export function AdvancedSearch({
  programme,
  budgetDocument,
  section,
  priorityAreaOptions,
  programmeOptions,
  sectionOptions,
  selectedPriorityArea,
  onProgrammeChange,
  onBudgetDocumentChange,
  onSectionChange,
  onPriorityAreaChange,
}: AdvancedSearchProps) {

  const programmeDropdownOptions = programmeOptions.map(p => ({ value: p, label: p }));
  const sectionDropdownOptions = sectionOptions.map(s => ({ value: s, label: s }));

  return (
    <TooltipProvider>
      <div className="border-t pt-4 mt-4 space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>{explainerTexts.advancedFilters.section.label}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{explainerTexts.advancedFilters.section.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
               <SearchableDropdown 
                options={sectionDropdownOptions}
                value={section}
                onChange={onSectionChange}
                placeholder={explainerTexts.advancedFilters.section.placeholder}
                searchPlaceholder='Search sections'
                emptyPlaceholder='No sections found'
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>{explainerTexts.advancedFilters.programme.label}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
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
                searchPlaceholder='Search programmes'
                emptyPlaceholder='No programmes found'
              />
            </div>
          </div>
          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="budget-document">{explainerTexts.advancedFilters.budgetDocument.label}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
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
                <SelectTrigger id="budget-document">
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
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="priority-area">{explainerTexts.advancedFilters.priorityArea.label}</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{explainerTexts.advancedFilters.priorityArea.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select 
                value={selectedPriorityArea} 
                onValueChange={onPriorityAreaChange}
              >
                <SelectTrigger id="priority-area">
                  <SelectValue placeholder={explainerTexts.advancedFilters.priorityArea.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority Areas</SelectItem>
                  <SelectSeparator />
                  {priorityAreaOptions.map((area) => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
      </div>
    </TooltipProvider>
  );
}
