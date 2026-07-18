'use client'

import { EntityName } from '@/components/EntityName'
import { OrganName } from '@/components/OrganName'
import { PopoverFilterList } from '@/components/PopoverFilterList'
import { DocumentTypeSidebar } from '@/components/SidebarDocumentTypeList'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { useFilters } from '@/contexts/FilterContext'
import { explainerTexts } from '@/lib/en_text_contents'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/types'
import { Building, Landmark, LucideIcon, FileText } from 'lucide-react'
import { ReactNode } from 'react'

interface HeaderStatsProps {
  data: ApiResponse
  /** 'column' (default) stacks the three cards; 'row' spreads them across. */
  orientation?: 'column' | 'row'
}

function StatRow({
  icon: Icon,
  label,
  value,
  description,
  children,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  description: string
  children: ReactNode
}) {
  return (
    <HoverCard openDelay={80} closeDelay={120}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2 rounded-lg bg-un-blue/10 px-3 py-1.5 text-left transition-colors',
            'hover:bg-un-blue/20 focus-visible:bg-un-blue/20 focus-visible:outline-none'
          )}
        >
          <Icon className="size-4 shrink-0 text-un-blue" />
          <span className="text-sm leading-tight text-un-blue">{label}</span>
          <span className="ml-auto text-2xl leading-none font-bold text-foreground tabular-nums">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        align="end"
        side="bottom"
        className="max-h-[60vh] w-[calc(100vw-2rem)] overflow-y-auto sm:w-80"
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export function HeaderStats({ data, orientation = 'column' }: HeaderStatsProps) {
  const { filters, setFilter } = useFilters()

  const { counts, filterOptions, reference, sidebar } = data
  const allOrgans = reference?.organs || []
  const allEntities = reference?.entities || []
  const organs = sidebar?.organs || []
  const entities = sidebar?.entities || []
  const documentTypes = filterOptions.documentTypes ?? []

  const organItems = organs.map((organ) => {
    const organData = allOrgans.find(
      (o) => o.short === organ.short || o.long === organ.short
    )
    return {
      key: organ.short,
      label: (
        <OrganName organName={organ.short} allOrgans={allOrgans} asChild />
      ),
      count: organ.count,
      isActive: filters.organ === organ.short,
      tooltipContent:
        organData && organData.short !== organData.long
          ? organData.long
          : undefined,
    }
  })

  const entityItems = entities.map((entity) => {
    const entityData = allEntities.find((e) => e.entity === entity.entity)
    return {
      key: entity.entity,
      label: (
        <EntityName
          entityName={entity.entity}
          entityLong={entityData?.entity_long}
          asChild
        />
      ),
      count: entity.count,
      isActive: filters.entity === entity.entity,
      tooltipContent:
        entityData?.entity_long && entityData.entity !== entityData.entity_long
          ? entityData.entity_long
          : undefined,
    }
  })

  return (
    <div
      className={cn(
        'w-full gap-2',
        orientation === 'row'
          ? 'grid grid-cols-1 sm:grid-cols-3'
          : 'flex flex-col sm:w-64'
      )}
    >
      <StatRow
        icon={Landmark}
        label={explainerTexts.dataCards.unOrgans.title}
        value={counts.totalOrgans}
        description={explainerTexts.dataCards.unOrgans.description}
      >
        <PopoverFilterList
          items={organItems}
          onItemClick={(organName) => setFilter('organ', organName)}
          searchPlaceholder="Search organs and bodies..."
          searchFilter={(item, term) =>
            item.key.toLowerCase().includes(term) ||
            (item.tooltipContent?.toLowerCase().includes(term) ?? false)
          }
          variant="filter"
          emptyMessage="No organs found"
        />
      </StatRow>
      <StatRow
        icon={Building}
        label={explainerTexts.dataCards.unEntities.title}
        value={counts.totalEntities}
        description={explainerTexts.dataCards.unEntities.description}
      >
        <PopoverFilterList
          items={entityItems}
          onItemClick={(entityName) => setFilter('entity', entityName)}
          searchPlaceholder="Search entities..."
          searchFilter={(item, term) =>
            item.key.toLowerCase().includes(term) ||
            (item.tooltipContent?.toLowerCase().includes(term) ?? false)
          }
          variant="filter"
          emptyMessage="No entities found"
        />
      </StatRow>
      <StatRow
        icon={FileText}
        label={explainerTexts.dataCards.sourceDocuments.title}
        value={counts.totalDocuments}
        description={explainerTexts.dataCards.sourceDocuments.description}
      >
        <DocumentTypeSidebar documentTypes={documentTypes} />
      </StatRow>
    </div>
  )
}
