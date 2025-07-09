'use client'

import { useState, useEffect, ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import { LoadingSkeleton } from '@/components/ui/loading-skeleton'
import { SearchInput } from '@/components/ui/search-input'

interface GenericSidebarProps<T> {
  // Header props
  icon: LucideIcon
  title: string
  description: string
  
  // Data props
  items: T[]
  isLoading?: boolean
  
  // Search props
  searchPlaceholder: string
  searchFilter: (item: T, searchTerm: string) => boolean
  
  // Rendering props
  renderItem: (item: T, index: number) => ReactNode
  
  // Display props
  hideHeader?: boolean
  borderless?: boolean
  showExpandCollapse?: boolean
  maxItemsBeforeExpand?: number
  
  // Empty state
  emptyMessage?: string
}

export function GenericSidebar<T>({
  icon: Icon,
  title,
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
  emptyMessage = "No items found"
}: GenericSidebarProps<T>) {
  const [filteredItems, setFilteredItems] = useState<T[]>(items)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAll, setShowAll] = useState(false)
  
  // Filter items based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(items)
    } else {
      const filtered = items.filter(item => searchFilter(item, searchTerm.toLowerCase()))
      setFilteredItems(filtered)
    }
  }, [searchTerm, items, searchFilter])

  // Determine items to display (with expand/collapse logic)
  const itemsToDisplay = showExpandCollapse 
    ? (showAll ? filteredItems : filteredItems.slice(0, maxItemsBeforeExpand))
    : filteredItems

  const hasMoreItems = showExpandCollapse && filteredItems.length > maxItemsBeforeExpand

  const LoadingSkeletonComponent = () => (
    <LoadingSkeleton variant="sidebar" count={8} />
  )

  return (
    <div className={borderless ? '' : 'border-l-2 border-gray-200 pl-4'}>
      {!hideHeader && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="h-5 w-5 text-un-blue" />
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      )}
      
      <div className="space-y-3">
        <SearchInput
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          variant="border-bottom"
        />
        
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <LoadingSkeletonComponent />
          ) : (
            <div className="space-y-1">
              {itemsToDisplay.map((item, index) => renderItem(item, index))}
              
              {hasMoreItems && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-sm text-un-blue hover:text-un-blue/80 mt-2 w-full text-left"
                >
                  {showAll 
                    ? 'Show less' 
                    : `Show ${filteredItems.length - maxItemsBeforeExpand} more`
                  }
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
  )
} 