'use client'
import { Download } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
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

export function ExportMenu({ totalDocuments }: { totalDocuments?: number }) {
  const params = useSearchParams()
  const scope =
    totalDocuments === undefined
      ? 'all matching documents'
      : `all ${totalDocuments.toLocaleString('en-US')} matching documents`
  const notify = (format: string) => {
    toast.info(`Preparing your ${format} download`, {
      description: `Includes ${scope}, across every page. Your browser will show the file when the download starts.`,
      duration: 10000,
    })
  }
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
          {totalDocuments === undefined
            ? 'Includes every page.'
            : `${totalDocuments.toLocaleString('en-US')} documents across every page.`}{' '}
          Grouped versions are expanded.
        </p>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={href('csv')} download onClick={() => notify('CSV')}>
            CSV
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={href('xlsx')} download onClick={() => notify('Excel')}>
            Excel
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={href('json')} download onClick={() => notify('JSON')}>
            JSON
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a
            href="/about#programmatic-access"
            className="max-w-64 text-xs text-muted-foreground"
          >
            <span>
              Need programmatic access?{' '}
              <span className="text-un-blue-text underline">Use the API</span>.
            </span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
