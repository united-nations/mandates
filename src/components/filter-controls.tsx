
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Search, XCircle } from 'lucide-react';

interface FilterControlsProps {
  entities: string[];
  years: number[];
  selectedEntity: string;
  selectedYear: string;
  keyword: string;
  onEntityChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onClearFilters: () => void;
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
}: FilterControlsProps) {
  return (
    <div className="p-6 bg-card rounded-lg shadow border border-border">
      <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center">
        <Filter size={20} className="mr-2 text-primary" />
        Filter Mandates
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_auto] gap-4 items-end">
        <div>
          <Label htmlFor="entity-filter" className="text-sm font-medium text-foreground mb-1 block">UN Entity</Label>
          <Select
            value={selectedEntity === '' ? ALL_ENTITIES_PLACEHOLDER : selectedEntity}
            onValueChange={(value) => {
              onEntityChange(value === ALL_ENTITIES_PLACEHOLDER ? '' : value);
            }}
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
          <Label htmlFor="year-filter" className="text-sm font-medium text-foreground mb-1 block">Year</Label>
          <Select
            value={selectedYear === '' ? ALL_YEARS_PLACEHOLDER : selectedYear}
            onValueChange={(value) => {
              onYearChange(value === ALL_YEARS_PLACEHOLDER ? '' : value);
            }}
          >
            <SelectTrigger id="year-filter" className="w-full bg-input">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_YEARS_PLACEHOLDER}>All Years</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="lg:col-span-1"> {/* Adjusted for new grid */}
          <Label htmlFor="keyword-filter" className="text-sm font-medium text-foreground mb-1 block">Keyword Search (Title/Content)</Label>
          <div className="relative">
            <Input
              id="keyword-filter"
              type="text"
              placeholder="Enter keywords..."
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              className="w-full pl-10 bg-input"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        
        <div>
          <Button onClick={onClearFilters} variant="outline" className="w-full">
            <XCircle size={16} className="mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
