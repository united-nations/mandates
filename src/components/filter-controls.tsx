'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface FilterControlsProps {
  entities: string[];
  priorityAreas: string[];
  selectedEntity: string;
  selectedPriorityArea: string;
  keyword: string;
  onEntityChange: (value: string) => void;
  onPriorityAreaChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onClearFilters: () => void;
  disabled?: boolean;
}

export function FilterControls({
  entities,
  priorityAreas,
  selectedEntity,
  selectedPriorityArea,
  keyword,
  onEntityChange,
  onPriorityAreaChange,
  onKeywordChange,
  onClearFilters,
  disabled,
}: FilterControlsProps) {
  return (
    <div className="p-4 bg-card border rounded-lg shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Keyword Search */}
        <Input
          placeholder="Search by keyword, symbol, or entity..."
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          disabled={disabled}
          className="lg:col-span-2"
        />

        {/* Priority Area Filter */}
        <Select onValueChange={onPriorityAreaChange} value={selectedPriorityArea} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by Priority Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority Areas</SelectItem>
            {priorityAreas.map((area) => (
              <SelectItem key={area} value={area}>
                {area}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Entity Filter */}
        <Select onValueChange={onEntityChange} value={selectedEntity} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {entities.map((entity) => (
              <SelectItem key={entity} value={entity}>
                {entity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={onClearFilters} variant="ghost" disabled={disabled}>
          Clear Filters
        </Button>
      </div>
    </div>
  );
} 