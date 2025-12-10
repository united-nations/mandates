"use client";

import * as React from "react";
import { Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface HierarchicalOption {
  level1: string;
  level2: string;
  prefix: string;
  count?: number;
}

interface HierarchicalSelectProps {
  options: HierarchicalOption[];
  selected: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  showPrefix?: boolean;
  sortByCount?: boolean;
}

export function HierarchicalSelect({
  options,
  selected,
  onSelectionChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  showPrefix = false,
  sortByCount = false,
}: HierarchicalSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [expandedCategories, setExpandedCategories] = React.useState<
    Set<string>
  >(new Set());

  // Group options by level1 and determine if they should be flattened
  const grouped = React.useMemo(() => {
    const map = new Map<
      string,
      { items: HierarchicalOption[]; isFlat: boolean }
    >();
    options.forEach((option) => {
      const key = option.level1;
      if (!map.has(key)) {
        map.set(key, { items: [], isFlat: false });
      }
      map.get(key)!.items.push(option);
    });

    // Determine if each group should be flattened
    map.forEach((value, key) => {
      const items = value.items;
      // Flatten if: only 1 item OR all items have same level1 and level2
      const shouldFlatten =
        items.length === 1 ||
        items.every((item) => item.level1 === item.level2);
      value.isFlat = shouldFlatten;
    });

    return map;
  }, [options]);

  // Define logical sort order
  const level1Order = [
    "General Assembly",
    "Security Council",
    "ECOSOC",
    "Treaty Bodies",
    "Secretariat",
    "Other",
  ];
  const level2Order: Record<string, string[]> = {
    "General Assembly": [
      "Plenary",
      "Resolutions",
      "Human Rights Council",
      "Subsidiary Bodies",
    ],
    "Security Council": [
      "Plenary",
      "Resolutions",
      "Presidential Statements",
      "Subsidiary Bodies",
    ],
    ECOSOC: [
      "Plenary",
      "Executive Boards",
      "Functional Commissions",
      "Committees",
      "Regional Commissions",
      "Conferences",
      "Expert Groups",
    ],
  };

  // Sort function for level1
  const sortLevel1 =
    (
      groupedData: Map<
        string,
        { items: HierarchicalOption[]; isFlat: boolean }
      >,
    ) =>
    (a: string, b: string) => {
      if (sortByCount) {
        // Sort by total count (descending)
        const countA =
          groupedData
            .get(a)
            ?.items.reduce((sum, item) => sum + (item.count || 0), 0) || 0;
        const countB =
          groupedData
            .get(b)
            ?.items.reduce((sum, item) => sum + (item.count || 0), 0) || 0;
        if (countA !== countB) return countB - countA;
      }

      // Otherwise use predefined order or alphabetical
      const indexA = level1Order.indexOf(a);
      const indexB = level1Order.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    };

  // Sort function for level2 within a level1
  const sortLevel2 =
    (level1: string) => (a: HierarchicalOption, b: HierarchicalOption) => {
      if (sortByCount) {
        // Sort by count (descending)
        const countA = a.count || 0;
        const countB = b.count || 0;
        if (countA !== countB) return countB - countA;
      }

      // Otherwise use predefined order or alphabetical
      const order = level2Order[level1] || [];
      const getKey = (item: HierarchicalOption) => item.level2.split(" - ")[0]; // Extract first part before dash
      const indexA = order.indexOf(getKey(a));
      const indexB = order.indexOf(getKey(b));
      if (indexA === -1 && indexB === -1)
        return a.level2.localeCompare(b.level2);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    };

  // Filter by search
  const filtered = React.useMemo(() => {
    const source = grouped;
    const searchLower = search.toLowerCase();
    const result = new Map<
      string,
      { items: HierarchicalOption[]; isFlat: boolean }
    >();

    source.forEach((group, level1) => {
      const matchingItems = search
        ? group.items.filter(
            (item) =>
              item.level1.toLowerCase().includes(searchLower) ||
              item.level2.toLowerCase().includes(searchLower) ||
              item.prefix.toLowerCase().includes(searchLower),
          )
        : group.items;

      if (matchingItems.length > 0) {
        result.set(level1, {
          items: matchingItems.sort(sortLevel2(level1)),
          isFlat: group.isFlat,
        });
      }
    });

    return result;
  }, [grouped, search]);

  const toggleOption = (level1: string, level2: string) => {
    const key = `${level1}|${level2}`;
    const newSelected = new Set(selected);

    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }

    onSelectionChange(newSelected);
  };

  const toggleLevel1 = (level1: string) => {
    const group = grouped.get(level1);
    if (!group) return;

    const allKeys = group.items.map((item) => `${item.level1}|${item.level2}`);
    const allSelected = allKeys.every((key) => selected.has(key));

    const newSelected = new Set(selected);

    if (allSelected) {
      // Deselect all
      allKeys.forEach((key) => newSelected.delete(key));
    } else {
      // Select all
      allKeys.forEach((key) => newSelected.add(key));
    }

    onSelectionChange(newSelected);
  };

  const toggleCategoryExpansion = (level1: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(level1)) {
      newExpanded.delete(level1);
    } else {
      newExpanded.add(level1);
    }
    setExpandedCategories(newExpanded);
  };

  const clearAll = () => {
    onSelectionChange(new Set());
  };

  const selectedCount = selected.size;

  const getDisplayName = (level2: string) => {
    // Extract just the abbreviation part before the dash for compact display
    const parts = level2.split(" - ");
    return parts[0];
  };

  const displayText =
    selectedCount === 0
      ? placeholder
      : selectedCount === 1
        ? (() => {
            const [level1, level2] = Array.from(selected)[0].split("|");
            return `${level1} > ${getDisplayName(level2)}`;
          })()
        : `${selectedCount} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <div className="flex items-center border-b p-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 p-0 focus-visible:ring-0"
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto p-2">
          {filtered.size === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              No results found
            </div>
          ) : (
            <div className="space-y-1">
              {Array.from(filtered.entries())
                .sort(([a], [b]) => sortLevel1(filtered)(a, b))
                .map(([level1, group]) => {
                  const { items, isFlat } = group;
                  const allKeys = items.map(
                    (item) => `${item.level1}|${item.level2}`,
                  );
                  const someSelected = allKeys.some((key) => selected.has(key));
                  const allSelected = allKeys.every((key) => selected.has(key));
                  const isExpanded = expandedCategories.has(level1);
                  const totalCount = items.reduce(
                    (sum, item) => sum + (item.count || 0),
                    0,
                  );

                  // If flat, render as a single item
                  if (isFlat) {
                    const item = items[0];
                    const key = `${item.level1}|${item.level2}`;
                    const isSelected = selected.has(key);

                    return (
                      <div
                        key={level1}
                        className="flex w-full items-center gap-2"
                      >
                        {/* Invisible spacer for alignment with expandable items */}
                        <div className="w-[28px]" />
                        <button
                          onClick={() => toggleOption(item.level1, item.level2)}
                          className="flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-100 font-medium"
                        >
                          <div
                            className={cn(
                              "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                              isSelected
                                ? "bg-blue-600 border-blue-600"
                                : "border-gray-300",
                            )}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <span className="flex-1 text-left">{level1}</span>
                          <span className="text-xs text-gray-500 shrink-0">
                            {totalCount}
                          </span>
                        </button>
                      </div>
                    );
                  }

                  // Otherwise render hierarchically
                  return (
                    <div key={level1} className="space-y-0.5">
                      <div className="flex w-full items-center gap-2">
                        <button
                          onClick={() => toggleCategoryExpansion(level1)}
                          className="w-[28px] h-[28px] flex items-center justify-center hover:bg-gray-100 rounded shrink-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleLevel1(level1)}
                          className="flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-100 font-medium"
                        >
                          <div
                            className={cn(
                              "h-4 w-4 rounded border flex items-center justify-center",
                              someSelected
                                ? "bg-blue-600 border-blue-600"
                                : "border-gray-300",
                            )}
                          >
                            {allSelected && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                            {someSelected && !allSelected && (
                              <div className="h-2 w-2 bg-white rounded-sm" />
                            )}
                          </div>
                          <span className="flex-1 text-left">{level1}</span>
                          <span className="text-xs text-gray-500">
                            {totalCount}
                          </span>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="ml-9 space-y-0.5">
                          {items.map((item) => {
                            const key = `${item.level1}|${item.level2}`;
                            const isSelected = selected.has(key);

                            // Parse level2 to show abbreviation and full name
                            const parts = item.level2.split(" - ");
                            const abbr = parts[0];
                            const fullName = parts.length > 1 ? parts[1] : null;

                            return (
                              <button
                                key={key}
                                onClick={() =>
                                  toggleOption(item.level1, item.level2)
                                }
                                className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50"
                              >
                                <div
                                  className={cn(
                                    "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0",
                                    isSelected
                                      ? "bg-blue-600 border-blue-600"
                                      : "border-gray-300",
                                  )}
                                >
                                  {isSelected && (
                                    <Check className="h-2.5 w-2.5 text-white" />
                                  )}
                                </div>
                                <span className="flex-1 text-left text-gray-700 min-w-0">
                                  {showPrefix && item.prefix && (
                                    <span className="font-mono text-xs text-blue-600 mr-2">
                                      {item.prefix}
                                    </span>
                                  )}
                                  {fullName ? (
                                    <>
                                      <span className="font-medium">
                                        {abbr}
                                      </span>
                                      <span className="text-gray-500">
                                        {" "}
                                        — {fullName}
                                      </span>
                                    </>
                                  ) : (
                                    <span>{abbr}</span>
                                  )}
                                </span>
                                {item.count !== undefined && (
                                  <span className="text-xs text-gray-500 shrink-0">
                                    {item.count}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="w-full"
            >
              Clear All ({selectedCount})
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
