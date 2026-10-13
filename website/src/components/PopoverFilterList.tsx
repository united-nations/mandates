'use client'

import { SearchInput } from '@/components/SearchInput'
import { SidebarListItem } from '@/components/SidebarListItem'
import { ReactNode, useState } from 'react'

interface PopoverFilterListItem {
  key: string
  label: ReactNode
  count: number
  isActive: boolean
  tooltipContent?: string
}

interface PopoverFilterListProps {
  items: PopoverFilterListItem[]
  onItemClick: (key: string) => void
  searchFilter?: (item: PopoverFilterListItem, term: string) => boolean
  searchPlaceholder?: string
  variant?: 'navigation' | 'filter'
  emptyMessage?: string
}

export function PopoverFilterList({
  items,
  onItemClick,
  searchFilter,
  searchPlaceholder = 'Search...',
  variant = 'filter',
  emptyMessage = 'No items found',
}: PopoverFilterListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const showSearch = items.length > 10

  const maxCount = Math.max(...items.map((i) => i.count), 1)

  const filtered = searchTerm.trim() && searchFilter
    ? items.filter((item) => searchFilter(item, searchTerm.toLowerCase()))
    : items

  return (
    <div className="space-y-2">
      {showSearch && (
        <SearchInput
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearchTerm(e.target.value)
          }
          variant="border-bottom"
        />
      )}
      <div className="space-y-0.5">
        {filtered.map((item) => (
          <SidebarListItem
            key={item.key}
            label={item.label}
            count={item.count}
            maxCount={maxCount}
            isActive={item.isActive}
            onClick={() => onItemClick(item.key)}
            variant={variant}
            tooltipContent={item.tooltipContent}
          />
        ))}
        {filtered.length === 0 && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  )
}
