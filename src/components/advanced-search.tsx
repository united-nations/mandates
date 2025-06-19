'use client';

import { SearchableDropdown } from './ui/searchable-dropdown';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';

interface AdvancedSearchProps {
  programme: string;
  budgetDocument: string;
  section: string;
  priorityAreaOptions: string[];
  programmeOptions: string[];
  sectionOptions: string[];
  pillarOptions: string[];
  selectedPriorityArea: string;
  selectedPillar: string;
  onProgrammeChange: (value: string) => void;
  onBudgetDocumentChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onPriorityAreaChange: (value: string) => void;
  onPillarChange: (value: string) => void;
}

export function AdvancedSearch({
  programme,
  budgetDocument,
  section,
  priorityAreaOptions,
  programmeOptions,
  sectionOptions,
  pillarOptions,
  selectedPriorityArea,
  selectedPillar,
  onProgrammeChange,
  onBudgetDocumentChange,
  onSectionChange,
  onPriorityAreaChange,
  onPillarChange,
}: AdvancedSearchProps) {

  return (
    <div className="border-t pt-4 mt-4 space-y-4">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="budget-document">Budget Document</Label>
            <Select 
              value={budgetDocument} 
              onValueChange={onBudgetDocumentChange}
            >
              <SelectTrigger id="budget-document">
                <SelectValue placeholder="Select document" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectSeparator />
                <SelectItem value="ppb2026">Proposed Programme Budget for 2026 (DRAFT)</SelectItem>
                <SelectItem value="pko2025-26">Budget of Peacekeeping Operations for 2025/26</SelectItem>
                <SelectItem value="plan2026-28">Plan Outline 2026-28</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Programme</Label>
            <SearchableDropdown 
              options={programmeOptions}
              value={programme}
              onChange={onProgrammeChange}
              placeholder='Filter by programme'
              searchPlaceholder='Search programmes'
              emptyPlaceholder='No programmes found'
            />
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
             <SearchableDropdown 
              options={sectionOptions}
              value={section}
              onChange={onSectionChange}
              placeholder='Filter by section'
              searchPlaceholder='Search sections'
              emptyPlaceholder='No sections found'
            />
          </div>
        </div>
        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priority-area">Priority Area</Label>
            <Select 
              value={selectedPriorityArea} 
              onValueChange={onPriorityAreaChange}
            >
              <SelectTrigger id="priority-area">
                <SelectValue placeholder="Select area" />
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
          <div className="space-y-2">
            <Label htmlFor="pillar">Pillar</Label>
            <Select 
              value={selectedPillar} 
              onValueChange={onPillarChange}
            >
              <SelectTrigger id="pillar">
                <SelectValue placeholder="Select pillar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pillars</SelectItem>
                <SelectSeparator />
                {pillarOptions.map((pillar) => (
                  <SelectItem key={pillar} value={pillar}>{pillar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
    </div>
  );
}
