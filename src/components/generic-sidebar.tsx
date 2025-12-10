"use client";

import { useState, useEffect, ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { SearchInput } from "@/components/search-input";

interface GenericSidebarProps<T> {
  // Header props
  icon: LucideIcon;
  title: string;
  titleLink?: string;
  description: string | ReactNode;

  // Data props
  items: T[];
  isLoading?: boolean;

  // Search props
  searchPlaceholder: string;
  searchFilter: (item: T, searchTerm: string) => boolean;

  // Rendering props
  renderItem: (
    item: T,
    index: number,
    variant: "navigation" | "filter",
  ) => ReactNode;

  // Display props
  hideHeader?: boolean;
  borderless?: boolean;
  showExpandCollapse?: boolean;
  maxItemsBeforeExpand?: number;

  // Visual variant
  variant?: "navigation" | "filter";

  // Empty state
  emptyMessage?: string;
}

export function GenericSidebar<T>({
  icon: Icon,
  title,
  titleLink,
  description,
  items,
  isLoading = false,
  searchPlaceholder,
  searchFilter,
  renderItem,
  hideHeader = false,
  borderless = false,
  showExpandCollapse = false,
  maxItemsBeforeExpand = 30,
  variant = "filter",
  emptyMessage = "No items found",
}: GenericSidebarProps<T>) {
  const [filteredItems, setFilteredItems] = useState<T[]>(items);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Filter items based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(items);
    } else {
      const filtered = items.filter((item) =>
        searchFilter(item, searchTerm.toLowerCase()),
      );
      setFilteredItems(filtered);
    }
  }, [searchTerm, items, searchFilter]);

  // Determine items to display (with expand/collapse logic)
  const itemsToDisplay = showExpandCollapse
    ? showAll
      ? filteredItems
      : filteredItems.slice(0, maxItemsBeforeExpand)
    : filteredItems;

  const hasMoreItems =
    showExpandCollapse && filteredItems.length > maxItemsBeforeExpand;

  const LoadingSkeletonComponent = () => (
    <LoadingSkeleton variant="sidebar" count={8} />
  );

  return (
    <div className={borderless ? "" : "border-l border-gray-200 pl-4"}>
      {!hideHeader && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="h-5 w-5 text-un-blue" />
            {titleLink ? (
              <a
                href={titleLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold hover:text-un-blue hover:underline"
              >
                {title}
              </a>
            ) : (
              <h3 className="text-lg font-semibold">{title}</h3>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}

      <div className="space-y-3">
        <SearchInput
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearchTerm(e.target.value)
          }
          variant="border-bottom"
        />

        <div
          className="max-h-112 overflow-y-auto"
          onWheel={(e) => {
            const target = e.currentTarget;
            const { scrollTop, scrollHeight, clientHeight } = target;

            // Check if scrolling up at the top
            if (e.deltaY < 0 && scrollTop === 0) {
              e.preventDefault();
            }
            // Check if scrolling down at the bottom
            else if (e.deltaY > 0 && scrollTop + clientHeight >= scrollHeight) {
              e.preventDefault();
            }
          }}
        >
          {isLoading ? (
            <LoadingSkeletonComponent />
          ) : (
            <div className="space-y-1">
              {itemsToDisplay.map((item, index) =>
                renderItem(item, index, variant),
              )}

              {hasMoreItems && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-sm text-un-blue hover:text-un-blue/80 mt-2 w-full text-left"
                >
                  {showAll
                    ? "Show less"
                    : `Show ${filteredItems.length - maxItemsBeforeExpand} more`}
                </button>
              )}

              {filteredItems.length === 0 && !isLoading && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
