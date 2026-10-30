'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFilters } from '@/contexts/FilterContext'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  className?: string
  trailingAction?: ReactNode
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  className = '',
  trailingAction,
}: PaginationControlsProps) {
  const { setFilter, setMultipleFilters } = useFilters()

  const handlePageChange = (page: number) => {
    setFilter('page', page.toString())
  }

  const handlePageSizeChange = (size: string) => {
    setMultipleFilters({
      limit: size,
      page: '1',
    })
  }

  if (totalPages <= 1 && !trailingAction) {
    return null
  }

  return (
    <div
      className={`grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] ${className}`}
    >
      <div className="flex items-center space-x-2 justify-self-start">
        <span className="text-sm text-muted-foreground">Show</span>
        <Select
          value={pageSize.toString()}
          onValueChange={handlePageSizeChange}
        >
          <SelectTrigger className="h-auto w-auto gap-1 border-0 bg-transparent px-0 text-sm text-muted-foreground shadow-none focus:ring-0 focus:ring-offset-0 focus:outline-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top">
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="15">15</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">per page</span>
      </div>

      <div className="flex flex-col items-center gap-2 justify-self-center md:flex-row md:gap-4">
        <div className="text-center text-sm text-muted-foreground">
          Page {currentPage} of {Math.max(1, totalPages)} (
          {totalItems.toLocaleString()} items)
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            aria-label="First page"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="Previous page"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="Next page"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="Last page"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="justify-self-end">{trailingAction}</div>
    </div>
  )
}
