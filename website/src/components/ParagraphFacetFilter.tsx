'use client'

import { useState } from 'react'
import { Chip } from '@/components/ui/chip'
import { ChevronDown } from 'lucide-react'
import { type PilotFacetNode } from '@/lib/paragraph-pilot'

export function ParagraphFacetFilter({
  label,
  className,
  nodes,
  value,
  open,
  onToggle,
  onChange,
  total,
  allLabel = 'All paragraphs',
  countFormat = 'count',
}: {
  label: string
  className: string
  nodes: PilotFacetNode[]
  value: string
  open: boolean
  onToggle: () => void
  onChange: (value: string) => void
  total: number
  allLabel?: string
  countFormat?: 'count' | 'percentage'
}) {
  const formatCount = (n: number) =>
    countFormat === 'count'
      ? n.toLocaleString()
      : `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(total ? (n / total) * 100 : 0)}%`
  const findLabel = (
    items: PilotFacetNode[],
    parents: string[] = []
  ): string | undefined => {
    for (const node of items) {
      const path = [...parents, node.label]
      if (node.value === value) return path.join(' › ')
      const child = findLabel(node.children, path)
      if (child) return child
    }
  }
  const [query, setQuery] = useState('')
  const term = query.toLowerCase().trim()
  const matches = (node: PilotFacetNode): boolean =>
    node.label.toLowerCase().includes(term) || node.children.some(matches)
  const render = (
    node: PilotFacetNode,
    depth: number,
    ancestorMatches = false
  ): React.ReactNode => {
    if (term && !ancestorMatches && !matches(node)) return null
    const matched = ancestorMatches || node.label.toLowerCase().includes(term)
    return (
      <div key={node.value}>
        <button
          type="button"
          aria-pressed={value === node.value}
          disabled={!node.count}
          onClick={() => onChange(node.value)}
          style={{ paddingLeft: `${12 + depth * 14}px` }}
          className={`flex w-full items-center justify-between gap-4 py-1.5 pr-3 text-left text-sm hover:bg-accent disabled:opacity-40 ${value === node.value ? 'bg-accent font-semibold text-un-blue-text' : depth === 0 ? 'font-medium' : ''}`}
        >
          <span>{node.label}</span>
          <span className="shrink-0 text-muted-foreground">
            {formatCount(node.count)}
          </span>
        </button>
        {node.children.map((child) => render(child, depth + 1, matched))}
      </div>
    )
  }
  return (
    <div className={`${className} relative`}>
      <Chip
        aria-expanded={open}
        onClick={() => {
          setQuery('')
          onToggle()
        }}
        className={`bg-transparent ${value !== 'all' ? 'text-un-blue-text' : 'text-muted-foreground'}`}
      >
        <span className="max-w-64 truncate">
          {value === 'all' ? label : (findLabel(nodes) ?? label)}
        </span>
        <ChevronDown className="ml-1 h-3 w-3" />
      </Chip>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-80 max-w-[calc(100vw-3rem)] rounded-md border border-border bg-background shadow-lg">
          <input
            aria-label={`Search ${label.toLowerCase()}`}
            placeholder={`Search ${label.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="m-2 w-[calc(100%-1rem)] rounded border border-border px-2 py-1.5 text-sm"
          />
          <div className="max-h-80 overflow-y-auto pb-1">
            <button
              type="button"
              onClick={() => onChange('all')}
              aria-pressed={value === 'all'}
              className={`flex w-full justify-between px-3 py-1.5 text-left text-sm hover:bg-accent ${value === 'all' ? 'bg-accent font-semibold text-un-blue-text' : ''}`}
            >
              <span>{allLabel}</span>
              <span>{formatCount(total)}</span>
            </button>
            {nodes.map((n) => render(n, 0))}
            {term && !nodes.some(matches) && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No matching options
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
