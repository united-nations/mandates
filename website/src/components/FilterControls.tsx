'use client'

import { SearchInput } from './SearchInput'
import { SearchSyntaxHint } from './SearchSyntaxHelp'
import { useEffect, useState } from 'react'
import { explainerTexts } from '@/lib/en_text_contents'
import { useFilters } from '@/contexts/FilterContext'

interface Entity {
  entity: string
  entity_long: string
}

interface Organ {
  short: string
  long: string
}

interface FilterControlsProps {
  entitiesData: Entity[]
  allOrgans: Organ[]
  toolbarSlot?: React.ReactNode
}

/**
 * The keyword search bar + toolbar for the mandate explorer. The "Active
 * filters" chip bar it used to render now lives in the standalone ActiveFilters
 * component so it can sit above the summary stat cards.
 */
export function FilterControls({ toolbarSlot }: FilterControlsProps) {
  const { filters, setFilter, clearFilter } = useFilters()

  const [searchInput, setSearchInput] = useState(filters.keyword || '')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync from external state
    setSearchInput(filters.keyword || '')
  }, [filters.keyword])

  const handleSearch = () => {
    const trimmedValue = searchInput.trim()
    if (trimmedValue !== (filters.keyword || '').trim()) {
      setFilter('keyword', trimmedValue || undefined)
    }
  }

  return (
    <div>
      {/* Search bar + toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 grow basis-48 items-center gap-2">
          <div className="relative min-w-0 grow">
            <SearchInput
            id="keyword-search"
            placeholder={explainerTexts.filters.keywordSearch.placeholder}
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchInput(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearch()
              }
            }}
            variant="border-bottom"
            showClearButton={true}
            helpControl={<SearchSyntaxHint />}
            onClear={() => {
              setSearchInput('')
              clearFilter('keyword')
            }}
          />
          </div>
        </div>
        <div className="contents">{toolbarSlot}</div>
      </div>
    </div>
  )
}
