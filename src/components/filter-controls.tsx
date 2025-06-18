'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface FilterControlsProps {
  entities: string[];
  priorityAreas: string[];
  selectedEntity: string;
  selectedPriorityArea: string;
  keyword: string;
  onEntityChange: (value: string) => void;
  onPriorityAreaChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
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
  disabled,
}: FilterControlsProps) {
  const showActiveFilters = selectedPriorityArea || selectedEntity;

  return (
    <div className="p-4 bg-card border rounded-lg shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Input
            placeholder="Search by keyword, symbol, or entity..."
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

        <Select onValueChange={onPriorityAreaChange} value={selectedPriorityArea} disabled={disabled}>
          <SelectTrigger className="w-full md:w-[280px]">
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

        <Select onValueChange={onEntityChange} value={selectedEntity} disabled={disabled}>
          <SelectTrigger className="w-full md:w-[280px]">
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

      {showActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">Active filters:</p>
          {selectedPriorityArea && (
            <Badge variant="secondary" className="flex items-center gap-1.5 pl-2 pr-1 py-1">
              {selectedPriorityArea}
              <button
                onClick={() => onPriorityAreaChange('')}
                disabled={disabled}
                className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                aria-label={`Remove ${selectedPriorityArea} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedEntity && (
            <Badge variant="secondary" className="flex items-center gap-1.5 pl-2 pr-1 py-1">
              {selectedEntity}
              <button
                onClick={() => onEntityChange('')}
                disabled={disabled}
                className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                aria-label={`Remove ${selectedEntity} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
} 