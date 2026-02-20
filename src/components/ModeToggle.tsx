'use client'

import { useFilters } from '@/contexts/FilterContext'
import type { DataMode } from '@/types'

interface ModeToggleProps {
  currentMode: DataMode
}

export function ModeToggle({ currentMode }: ModeToggleProps) {
  const { setFilter } = useFilters()

  const isActive = currentMode !== 'documents'

  const handleToggle = () => {
    setFilter('mode', isActive ? 'documents' : undefined)
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-sm ${!isActive ? 'font-semibold text-un-blue' : 'text-slate-400'}`}
      >
        All documents
      </span>
      <button
        role="switch"
        aria-checked={isActive}
        onClick={handleToggle}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-2"
        style={{ backgroundColor: '#009edb' }}
      >
        <span
          className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform"
          style={{ transform: isActive ? 'translateX(20px)' : 'translateX(0px)' }}
        />
      </button>
      <span
        className={`text-sm ${isActive ? 'font-semibold text-un-blue' : 'text-slate-400'}`}
      >
        Mandate source documents
      </span>
    </div>
  )
}
