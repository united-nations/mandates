'use client'

import { SidebarListItem } from '@/components/SidebarListItem'
import { SearchInput } from '@/components/SearchInput'
import { useFilters } from '@/contexts/FilterContext'
import { useState } from 'react'

interface DocumentTypeSidebarProps {
  documentTypes: { value: string; count: number }[]
}

export function DocumentTypeSidebar({
  documentTypes,
}: DocumentTypeSidebarProps) {
  const { filters, setFilter, clearFilter } = useFilters()
  const [searchTerm, setSearchTerm] = useState('')

  const maxCount = Math.max(...documentTypes.map((d) => d.count), 1)
  const showSearch = documentTypes.length > 10

  const filtered = searchTerm.trim()
    ? documentTypes.filter((d) =>
        d.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : documentTypes

  const handleClick = (value: string) => {
    if (filters.document_type === value) {
      clearFilter('document_type')
    } else {
      setFilter('document_type', value)
    }
  }

  return (
    <div className="space-y-2">
      {showSearch && (
        <SearchInput
          placeholder="Search document types..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearchTerm(e.target.value)
          }
          variant="border-bottom"
        />
      )}
      <div className="space-y-0.5">
        {filtered.map((dt) => (
          <SidebarListItem
            key={dt.value}
            label={dt.value}
            count={dt.count}
            maxCount={maxCount}
            isActive={filters.document_type === dt.value}
            onClick={() => handleClick(dt.value)}
            variant="filter"
          />
        ))}
        {filtered.length === 0 && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No document types found
          </div>
        )}
      </div>
    </div>
  )
}
