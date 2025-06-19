'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';

interface AdvancedSearchProps {
  programme: string;
  year: string;
  budgetDocument: string;
  section: string;
  priorityAreaOptions: string[];
  selectedPriorityArea: string;
  onProgrammeChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onBudgetDocumentChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onPriorityAreaChange: (value: string) => void;
  disabled?: boolean;
}

export function AdvancedSearch({
  programme,
  year,
  budgetDocument,
  section,
  priorityAreaOptions,
  selectedPriorityArea,
  onProgrammeChange,
  onYearChange,
  onBudgetDocumentChange,
  onSectionChange,
  onPriorityAreaChange,
  disabled,
}: AdvancedSearchProps) {
  return (
    <div className="border-t pt-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="programme">Programme</Label>
            <Input 
              id="programme" 
              placeholder="Enter programme" 
              value={programme}
              onChange={(e) => onProgrammeChange(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input 
              id="year" 
              placeholder="Enter year" 
              value={year}
              onChange={(e) => onYearChange(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority-area">Priority Area</Label>
            <Select 
              value={selectedPriorityArea} 
              onValueChange={onPriorityAreaChange}
              disabled={disabled}
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
            <Label htmlFor="budget-document">Budget Document</Label>
            <Select 
              value={budgetDocument} 
              onValueChange={onBudgetDocumentChange}
              disabled={disabled}
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
            <Label htmlFor="section">Section</Label>
            <Input 
              id="section" 
              placeholder="Enter section" 
              value={section}
              onChange={(e) => onSectionChange(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
    </div>
  );
}
