'use client'
import { Download } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { FILTER_PARAMS } from '@/lib/filter-constants'

export function ExportMenu() {
  const params = useSearchParams()
  const href = (format: string) => {
    const query = new URLSearchParams()
    for (const key of FILTER_PARAMS)
      if (!['page', 'limit'].includes(key) && params.has(key))
        query.set(key, params.get(key)!)
    if (params.has('mode')) query.set('mode', params.get('mode')!)
    query.set('format', format)
    return `/api/v1/exports?${query}`
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download aria-hidden className="size-4" />
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>All matching documents</DropdownMenuLabel>
        <p className="max-w-64 px-2 pb-2 text-xs text-muted-foreground">
          Includes every page. Grouped versions are expanded.
        </p>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={href('csv')} download>
            CSV
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={href('xlsx')} download>
            Excel
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={href('json')} download>
            JSON
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
