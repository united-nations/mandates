'use client'

import { useState, useEffect } from 'react'
import { Building, Users, Link as LinkIcon, Landmark } from 'lucide-react'
import { MandateExplorer } from '@/components/mandate-explorer'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ConsolidatedFilterSidebar } from './consolidated-filter-sidebar'
import { CrossCitations } from './cross-citations'
import { OrganListSidebar } from '@/components/organ-list-sidebar'

interface Entity {
  entity: string
  entity_long: string
  url?: string
  principal_organ?: string
}

interface EntityOverlayContentProps {
  entityName: string
}

export function EntityOverlayContent({ entityName }: EntityOverlayContentProps) {
  const [entityLongName, setEntityLongName] = useState<string>('')
  const [entityUrl, setEntityUrl] = useState<string | null>(null)
  const [principalOrgan, setPrincipalOrgan] = useState<string | null>(null)
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null)
  const [organCrossCitations, setOrganCrossCitations] = useState<any[]>([])

  useEffect(() => {
    async function fetchEntityDetails() {
      try {
        const res = await fetch('/api/entities')
        if (res.ok) {
          const data = await res.json()
          const entity = data.find((e: Entity) => e.entity === entityName)
          if (entity) {
            setEntityLongName(entity.entity_long)
            setEntityUrl(entity.url || null)
            setPrincipalOrgan(entity.principal_organ || null)
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

  // Fetch organ cross-citations for the current entity
  useEffect(() => {
    async function fetchOrganCrossCitations() {
      if (effectiveEntity) {
        const res = await fetch(`/api/entities/${encodeURIComponent(effectiveEntity)}/cross-citations`)
        if (res.ok) {
          const data = await res.json()
          setOrganCrossCitations(data.filter((item: any) => item.organ))
        } else {
          setOrganCrossCitations([])
        }
      } else {
        setOrganCrossCitations([])
      }
    }
    fetchOrganCrossCitations()
  }, [effectiveEntity])

  return (
    <TooltipProvider>
      <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto py-6 space-y-6 px-8 sm:px-12 lg:px-16">
        <div className="flex flex-col lg:flex-row gap-8">
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
                {/* Show URL and Principal Organ if available */}
                {(entityUrl || principalOrgan) && (
                  <div className="mt-2 space-y-2 bg-muted/40 rounded px-3 py-2">
                    {entityUrl && (
                      <div className="flex items-center gap-2 text-sm">
                        <LinkIcon className="h-4 w-4 text-un-blue" />
                        <span className="font-semibold">Website:</span>
                        <a href={entityUrl} target="_blank" rel="noopener noreferrer" className="text-un-blue underline break-all hover:text-un-blue/80 transition-colors">{entityUrl.replace(/^https?:\/\//, '')}</a>
                      </div>
                    )}
                    {principalOrgan && (
                      <div className="flex items-center gap-2 text-sm">
                        <Landmark className="h-4 w-4 text-un-blue" />
                        <span className="font-semibold">Principal Organ:</span>
                        <span>{principalOrgan} <span className="text-xs text-muted-foreground"></span></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="text-muted-foreground mt-2 sm:text-justify">
                <p className="leading-tight mb-3">
                  Mandates and cross-citations for <strong>{entityLongName || entityName}</strong>.
                </p>
              </div>
            </div>
            {/* Data cards could go here if needed */}
            {/* MandateExplorer with integrated cross-citations sidebar */}
            <MandateExplorer 
              presetEntity={effectiveEntity}
              presetOrgan={effectiveOrgan}
              showEntityCard={false}
              showCrossCitations={false}
              mandateListTitle={`Documents Cited by ${entityLongName || entityName}`}
              crossCitationsSidebar={
                <div className="flex flex-col gap-4">
                  <ConsolidatedFilterSidebar 
                    onEntityClick={setSelectedEntity} 
                    onOrganClick={setSelectedOrgan} 
                    selectedEntity={effectiveEntity} 
                    selectedOrgan={effectiveOrgan} 
                    currentEntity={effectiveEntity}
                  />
                  <OrganListSidebar onOrganClick={setSelectedOrgan} currentEntity={effectiveEntity} organCrossCitations={organCrossCitations} />
                </div>
              }
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
} 