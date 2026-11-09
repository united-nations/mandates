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
import { EXPORT_ROW_CAP } from '@/lib/api-limits'
import { explainerTexts } from '@/lib/en_text_contents'

const FORMATS = [
  { format: 'csv', label: 'CSV' },
  { format: 'xlsx', label: 'Excel' },
  { format: 'json', label: 'JSON' },
] as const

/**
 * `totalDocuments` is the exact number a download would contain. When
 * versions are grouped it is not known here (the download expands them), and
 * `minimumDocuments`, the group count, is a lower bound instead.
 */
export function ExportMenu({
  totalDocuments,
  minimumDocuments,
}: {
  totalDocuments?: number
  minimumDocuments?: number
}) {
  const params = useSearchParams()
  const overLimit = (totalDocuments ?? minimumDocuments ?? 0) > EXPORT_ROW_CAP
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
          {overLimit
            ? explainerTexts.exportMenu.overLimit.replace(
                '{limit}',
                EXPORT_ROW_CAP.toLocaleString('en-US')
              )
            : `${
                totalDocuments === undefined
                  ? 'Includes every page.'
                  : `${totalDocuments.toLocaleString('en-US')} documents across every page.`
              } Grouped versions are expanded.`}
        </p>
        <DropdownMenuSeparator />
        {FORMATS.map(({ format, label }) =>
          overLimit ? (
            <DropdownMenuItem key={format} disabled>
              {label}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={format} asChild>
              {/* No `download` attribute, so an error response is shown as a
                  page rather than saved as a file. */}
              <a href={href(format)} onClick={() => notify(label)}>
                {label}
              </a>
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
