'use client'

import { useState, useEffect } from 'react'
import { Building } from 'lucide-react'
import { MandateExplorer } from '@/components/mandate-explorer'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EntityFilterList } from './entity-filter-list'
import { OrganFilterList } from './organ-filter-list'

interface Entity {
  entity: string
  entity_long: string
}

interface EntityOverlayContentProps {
  entityName: string
}

export function EntityOverlayContent({ entityName }: EntityOverlayContentProps) {
  const [entityLongName, setEntityLongName] = useState<string>('')
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEntityDetails() {
      try {
        const res = await fetch('/api/entities')
        if (res.ok) {
          const data = await res.json()
          const entity = data.find((e: Entity) => e.entity === entityName)
          if (entity) {
            setEntityLongName(entity.entity_long)
          }
        }
      } catch (error) {
        console.error("Failed to fetch entity details:", error)
      }
    }
    fetchEntityDetails()
  }, [entityName])

  // When a filter is selected, update the MandateExplorer props
  const effectiveEntity = selectedEntity || entityName
  const effectiveOrgan = selectedOrgan || undefined

  return (
    <TooltipProvider>
      <div className="flex flex-col lg:flex-row gap-8 p-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="pb-2">
            <div className="mb-6 mt-2">
              <div className="flex items-center gap-3 mb-2">
                <Building className="h-8 w-8 text-un-blue" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {entityLongName || entityName}
                </h1>
              </div>
              {entityLongName && entityLongName !== entityName && (
                <div className="text-muted-foreground">
                  <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{entityName}</span>
                </div>
              )}
            </div>
            <div className="text-muted-foreground mt-2 sm:text-justify">
              <p className="leading-tight mb-3">
                Exploring mandates and cross-citations for <strong>{entityLongName || entityName}</strong>. 
                This view shows all source documents that this entity cites, along with other entities that cite the same mandates.
              </p>
            </div>
          </div>
          {/* Mandate Explorer with preset entity/organ filter */}
          <MandateExplorer 
            presetEntity={effectiveEntity}
            presetOrgan={effectiveOrgan}
            showEntityCard={false}
            mandateListTitle={`Documents Cited by ${entityLongName || entityName}`}
          />
        </div>
        {/* Filter sidebars */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-8">
          <EntityFilterList onEntityClick={setSelectedEntity} selectedEntity={effectiveEntity} />
          <OrganFilterList onOrganClick={setSelectedOrgan} selectedOrgan={effectiveOrgan} />
        </div>
      </div>
    </TooltipProvider>
  )
} 