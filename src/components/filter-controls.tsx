'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { AdvancedSearch } from '@/components/advanced-search';
import { YearSlider } from './year-slider';

interface FilterControlsProps {
  entityOptions: string[];
  organOptions: string[];
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
  disabled?: boolean;
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
  disabled,
}: FilterControlsProps) {
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const topOrgans = ['General Assembly', 'Security Council', 'Economic and Social Council'];
  const sortedOrgans = [...organOptions].sort((a, b) => {
    const aIsTop = topOrgans.includes(a);
    const bIsTop = topOrgans.includes(b);
    if (aIsTop && !bIsTop) return -1;
    if (!aIsTop && bIsTop) return 1;
    if (aIsTop && bIsTop) return topOrgans.indexOf(a) - topOrgans.indexOf(b);
    return a.localeCompare(b);
  });

  return (
    <div className="p-4 bg-card border rounded-lg shadow-sm space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="relative lg:col-span-1">
          <Input
            placeholder="Search for any keyword..."
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            disabled={disabled}
            className="pr-10"
          />
          {keyword && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-full px-3"
              onClick={() => onKeywordChange('')}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Select onValueChange={onOrganChange} value={selectedOrgan} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by UN Organ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All UN Organs</SelectItem>
            <SelectSeparator />
            {sortedOrgans.map((organ) => (
              <SelectItem key={organ} value={organ}>
                {organ}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={onEntityChange} value={selectedEntity} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by UN Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All UN Entities</SelectItem>
            <SelectSeparator />
            {entityOptions.map((entity) => (
              <SelectItem key={entity} value={entity}>
                {entity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          disabled={disabled}
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