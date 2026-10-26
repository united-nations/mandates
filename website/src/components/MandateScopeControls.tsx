'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useFilters } from '@/contexts/FilterContext'
import type { BudgetVersion } from '@/lib/data/budget-documents'
import { explainerTexts } from '@/lib/en_text_contents'
import { cn } from '@/lib/utils'

const text = explainerTexts.secretariatNavigation.scope

export function CitedMandatesToggle() {
  const { filters, setFilter, isPending } = useFilters()
  const selected = filters.cited === '1'

  return (
    <label
      className={cn(
        'inline-flex h-8 cursor-pointer items-center gap-1.5 text-sm whitespace-nowrap',
        selected ? 'font-medium text-foreground' : 'text-muted-foreground'
      )}
    >
      <Switch
        checked={selected}
        onCheckedChange={(checked) =>
          setFilter('cited', checked ? '1' : undefined)
        }
        disabled={isPending}
      />
      {text.citedOnly}
    </label>
  )
}

/** Keep the closed selector compact; show full budget descriptions in the menu. */
export function CitationBudgetSelect({
  versions,
  activeVersionSlug,
}: {
  versions: BudgetVersion[]
  activeVersionSlug: string
}) {
  const { setFilter, isPending } = useFilters()
  const activeVersion = versions.find(
    (version) => version.slug === activeVersionSlug
  )

  return (
    <Select
      value={activeVersionSlug}
      onValueChange={(value) => setFilter('ppb_version', value)}
      disabled={isPending}
    >
      <SelectTrigger
        aria-label={`${text.budget}: ${activeVersion?.display_name ?? activeVersionSlug}`}
        className="h-8 w-auto gap-1.5 border-transparent bg-transparent px-1.5 py-0 text-muted-foreground shadow-none hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
      >
        <SelectValue>
          {activeVersion
            ? text.budgetShort.replace('{year}', String(activeVersion.ppb_year))
            : text.budget}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="w-[32rem] max-w-[calc(100vw-2rem)]">
        {versions.map((version) => (
          <SelectItem key={version.slug} value={version.slug}>
            {version.display_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
