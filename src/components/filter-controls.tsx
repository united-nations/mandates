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
    <div className="p-6 mb-8 bg-card rounded-lg shadow-md border border-border">
      <h2 className="text-2xl font-headline text-primary mb-6 flex items-center">
        <Filter size={24} className="mr-3" />
        Filter Mandates
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
        <div>
          <Label htmlFor="entity-filter" className="text-sm font-medium text-foreground mb-1 block">UN Entity</Label>
          <Select value={selectedEntity} onValueChange={onEntityChange}>
            <SelectTrigger id="entity-filter" className="w-full">
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Entities</SelectItem>
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
          <Select value={selectedYear} onValueChange={onYearChange}>
            <SelectTrigger id="year-filter" className="w-full">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Years</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 lg:col-span-1">
          <Label htmlFor="keyword-filter" className="text-sm font-medium text-foreground mb-1 block">Keyword</Label>
          <div className="relative">
            <Input
              id="keyword-filter"
              type="text"
              placeholder="Search by keyword..."
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              className="w-full pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        
        <div>
          <Button onClick={onClearFilters} variant="outline" className="w-full">
            <XCircle size={18} className="mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
