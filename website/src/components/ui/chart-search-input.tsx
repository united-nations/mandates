'use client'

import { Search, X } from 'lucide-react'

interface ChartSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** Optional label for the clear button (for accessibility) */
  clearLabel?: string
}

export function ChartSearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  clearLabel = 'Clear search',
}: ChartSearchInputProps) {
  const hasValue = value.trim() !== ''

  return (
    <div className={`relative w-full sm:w-64 ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
        <Search className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`block h-9 w-full rounded-none border-0 border-b border-gray-300 bg-transparent py-1.5 pl-8 text-sm placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-0 ${hasValue ? 'pr-8' : 'pr-3'}`}
      />
      {hasValue && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 transition-colors hover:text-gray-600"
          aria-label={clearLabel}
          title={clearLabel}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
