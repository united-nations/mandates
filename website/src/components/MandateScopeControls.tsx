'use client'

import { Switch } from '@/components/ui/switch'
import { useFilters } from '@/contexts/FilterContext'
import type { BudgetVersion } from '@/lib/data/budget-documents'
import { explainerTexts } from '@/lib/en_text_contents'

const text = explainerTexts.secretariatNavigation.scope

/** Citation controls belong to the explorer, outside its navigation cards. */
export function MandateScopeControls({
  versions,
  activeVersionSlug,
}: {
  versions: BudgetVersion[]
  activeVersionSlug: string
}) {
  const { filters, setFilter, isPending } = useFilters()

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <label className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">{text.budget}</span>
        <select
          value={activeVersionSlug}
          onChange={(event) => setFilter('ppb_version', event.target.value)}
          disabled={isPending}
          className="h-9 max-w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {versions.map((version) => (
            <option key={version.slug} value={version.slug}>
              {version.display_name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-9 items-center gap-2 text-sm text-foreground">
        <Switch
          checked={filters.cited === '1'}
          onCheckedChange={(checked) =>
            setFilter('cited', checked ? '1' : undefined)
          }
          disabled={isPending}
        />
        {text.citedOnly}
      </label>
    </div>
  )
}
