'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { AdvancedSearch } from '@/components/advanced-search';
import { YearSlider } from './year-slider';
import { SearchableDropdown, SearchableDropdownOption } from '@/components/ui/searchable-dropdown';

interface FilterControlsProps {
  entityOptions: SearchableDropdownOption[];
  organOptions: SearchableDropdownOption[];
  priorityAreaOptions: string[];
  programmeOptions: string[];
  sectionOptions: string[];
  pillarOptions: string[];
  selectedEntity: string;
  selectedOrgan: string;
  selectedPriorityArea: string;
  selectedPillar: string;
  keyword: string;
  onEntityChange: (value: string) => void;
  onOrganChange: (value: string) => void;
  onPriorityAreaChange: (value: string) => void;
  onPillarChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  programme: string;
  yearRange: { min: number; max: number } | null;
  yearDistribution: { [year: string]: number };
  selectedYearRange: [number, number] | null;
  budgetDocument: string;
  section: string;
  onProgrammeChange: (value: string) => void;
  onYearRangeChange: (value: [number, number]) => void;
  onBudgetDocumentChange: (value: string) => void;
  onSectionChange: (value: string) => void;
}

export function FilterControls({
  entityOptions,
  organOptions,
  priorityAreaOptions,
  programmeOptions,
  sectionOptions,
  pillarOptions,
  selectedEntity,
  selectedOrgan,
  selectedPriorityArea,
  selectedPillar,
  keyword,
  onEntityChange,
  onOrganChange,
  onPriorityAreaChange,
  onPillarChange,
  onKeywordChange,
  programme,
  yearRange,
  yearDistribution,
  selectedYearRange,
  budgetDocument,
  section,
  onProgrammeChange,
  onYearRangeChange,
  onBudgetDocumentChange,
  onSectionChange,
}: FilterControlsProps) {
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  return (
    <div className="p-4 bg-card border rounded-lg shadow-sm space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Input
            placeholder="Search for any keyword..."
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className="pr-10"
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

        <SearchableDropdown
          options={organOptions}
          value={selectedOrgan}
          onChange={onOrganChange}
          placeholder="Filter by UN Organ"
          searchPlaceholder="Search organs..."
          emptyPlaceholder="No organs found."
        />

        <SearchableDropdown
          options={entityOptions}
          value={selectedEntity}
          onChange={onEntityChange}
          placeholder="Filter by UN Entity"
          searchPlaceholder="Search entities..."
          emptyPlaceholder="No entities found."
        />
      </div>

      <div className="flex justify-start">
        <Button variant="link" onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}>
          {showAdvancedSearch ? 'Hide Advanced Filter' : 'Show Advanced Filter'}
          {showAdvancedSearch ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
        </Button>
      </div>

      {showAdvancedSearch && (
        <>
        <AdvancedSearch
          programme={programme}
          budgetDocument={budgetDocument}
          section={section}
          onProgrammeChange={onProgrammeChange}
          onBudgetDocumentChange={onBudgetDocumentChange}
          onSectionChange={onSectionChange}
          priorityAreaOptions={priorityAreaOptions}
          selectedPriorityArea={selectedPriorityArea}
          onPriorityAreaChange={onPriorityAreaChange}
          programmeOptions={programmeOptions}
          sectionOptions={sectionOptions}
          pillarOptions={pillarOptions}
          selectedPillar={selectedPillar}
          onPillarChange={onPillarChange}
        />
        {yearRange && selectedYearRange && (
          <div className="pt-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Filter by Year Range</h3>
              <YearSlider
                  yearDistribution={yearDistribution}
                  yearRange={yearRange}
                  value={selectedYearRange}
                  onChange={onYearRangeChange}
              />
          </div>
        )}
        </>
      )}
    </div>
  );
}