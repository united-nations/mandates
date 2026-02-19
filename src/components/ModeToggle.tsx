'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFilters } from '@/contexts/FilterContext'
import { Database, FileText } from 'lucide-react'
import type { DataMode } from '@/types'

interface ModeToggleProps {
  currentMode: DataMode
}

/**
 * Toggle between PPB (mandate-cited) documents and All UN documents.
 * Switching mode clears PPB-only filters (entity, programme, budget_document)
 * and resets pagination.
 */
export function ModeToggle({ currentMode }: ModeToggleProps) {
  const { setMultipleFilters } = useFilters()

  const handleModeChange = (newMode: string) => {
    if (newMode === currentMode) return

    if (newMode === 'documents') {
      // Clear PPB-only filters when switching to All mode
      setMultipleFilters({
        mode: 'documents',
        entity: undefined,
        crossCitingEntity: undefined,
        programme: undefined,
        budget_document: undefined,
        sort_by: 'year_desc',
        page: '1',
      })
    } else {
      // Clear All-only filters when switching to PPB mode
      setMultipleFilters({
        mode: undefined, // ppb is default, omit from URL
        document_type: undefined,
        sort_by: 'citing_entities_desc',
        page: '1',
      })
    }
  }

  return (
    <Tabs
      value={currentMode}
      onValueChange={handleModeChange}
      className="w-auto"
    >
      <TabsList className="h-9">
        <TabsTrigger
          value="ppb"
          className="gap-1.5 px-3 text-xs sm:text-sm"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>PPB Cited</span>
        </TabsTrigger>
        <TabsTrigger
          value="documents"
          className="gap-1.5 px-3 text-xs sm:text-sm"
        >
          <Database className="h-3.5 w-3.5" />
          <span>All Documents</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
