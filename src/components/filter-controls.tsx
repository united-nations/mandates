'use client';

import { Filter } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface FilterControlsProps {
  entities: string[];
  years: number[];
  selectedEntity: string;
  selectedYear: string;
  keyword: string;
  onEntityChange: (entity: string) => void;
  onYearChange: (year: string) => void;
  onKeywordChange: (keyword: string) => void;
  onClearFilters: () => void;
  disabled?: boolean;
}

const ALL_ENTITIES_PLACEHOLDER = "__ALL_ENTITIES__";
const ALL_YEARS_PLACEHOLDER = "__ALL_YEARS__";

export function FilterControls({
  entities,
  years,
  selectedEntity,
  selectedYear,
  keyword,
  onEntityChange,
  onYearChange,
  onKeywordChange,
  onClearFilters,
  disabled = false,
}: FilterControlsProps) {
  return (
    <div className="p-6 bg-card rounded-lg shadow border border-border">
      <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
        <Filter size={20} className="mr-2 text-primary" />
        Filter Mandate Documents
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_auto] gap-4 items-end">
        <div>
          <Label htmlFor="entity-filter" className="text-sm font-medium text-foreground mb-1 block">UN Entity</Label>
          <Select
            value={selectedEntity === '' ? ALL_ENTITIES_PLACEHOLDER : selectedEntity}
            onValueChange={(value) => {
              onEntityChange(value === ALL_ENTITIES_PLACEHOLDER ? '' : value);
            }}
            disabled={disabled}
          >
            <SelectTrigger id="entity-filter" className="w-full bg-input">
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ENTITIES_PLACEHOLDER}>All Entities</SelectItem>
              {entities.map((entity) => (
                <SelectItem key={entity} value={entity}>
                  {entity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="year-filter" className="text-sm font-medium text-foreground mb-1 block">Publication Year</Label>
          <Select
            value={selectedYear === '' ? ALL_YEARS_PLACEHOLDER : selectedYear}
            onValueChange={(value) => {
              onYearChange(value === ALL_YEARS_PLACEHOLDER ? '' : value);
            }}
            disabled={disabled}
          >
            <SelectTrigger id="year-filter" className="w-full bg-input">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_YEARS_PLACEHOLDER}>All Years</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="keyword-filter" className="text-sm font-medium text-foreground mb-1 block">Search Keywords</Label>
          <Input
            id="keyword-filter"
            type="text"
            placeholder="Search in title, document symbol, entity, subjects..."
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className="w-full bg-input"
            disabled={disabled}
          />
        </div>

        <div>
          <Button 
            variant="outline" 
            onClick={onClearFilters}
            className="w-full"
            type="button"
            disabled={disabled}
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
